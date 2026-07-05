import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { runSerializable } from '@/lib/server/db-tx';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import { enrollTeamMemberInPurchasedCourse } from '@/lib/server/team-course-purchase';

/** POST /api/lms/teams/invite/accept — accept invite token. */
export async function POST(request: NextRequest) {
  // Membership-mutating route: gated behind the subscriptions flag for
  // consistency with the sibling Teams/org routes (teams/enroll, org/enroll, …).
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: 'Teams membership is not yet available.' }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json({ detail: 'Token required' }, { status: 400 });
  }

  try {
    const invite = await prisma.lmsTeamInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite || invite.acceptedAt) {
      return NextResponse.json({ detail: 'Invalid or used invite' }, { status: 404 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ detail: 'Invite expired' }, { status: 410 });
    }

    const user = await prisma.lmsUser.findUnique({ where: { id: claims.sub } });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { detail: 'This invite was sent to a different email address' },
        { status: 403 }
      );
    }

    // Enforce the PAID seat limit for Teams subscription teams (E2, GP-442); the
    // 6th acceptance on a 5-seat plan is rejected (spec §15 #4). Other teams use
    // the team.seatLimit column.
    const teamSub =
      invite.team.bundleTier === 'teams_subscription'
        ? await prisma.lmsTeamSubscription.findUnique({ where: { teamId: invite.teamId } })
        : null;
    const effectiveSeatLimit = teamSub ? teamSub.seatLimit : invite.team.seatLimit;

    // The seat-limit guard and the member insert MUST be atomic. A plain
    // count()-then-insert() is a TOCTOU race: two concurrent acceptances on the
    // last free seat both read the same count, both pass the guard, and both
    // insert — putting member rows past the paid seat limit (the sibling
    // count-then-create in the quiz-attempt route hit the same class of bug).
    // SERIALIZABLE isolation makes Postgres detect the read/write conflict and
    // abort all but one racer (retried by runSerializable), so the (seatLimit+1)th
    // concurrent acceptance is rejected here with the same 409 + seat-expansion
    // path the non-concurrent over-limit case returns. The invite is consumed in
    // the same transaction, so it is only marked accepted when the member is
    // actually seated. An already-seated member (idempotent re-accept) does not
    // consume a fresh seat.
    const result = await runSerializable(async (tx) => {
      const existing = await tx.lmsTeamMember.findUnique({
        where: { teamId_userId: { teamId: invite.teamId, userId: claims.sub } },
        select: { userId: true },
      });
      if (!existing) {
        const seatsUsed = await tx.lmsTeamMember.count({ where: { teamId: invite.teamId } });
        if (seatsUsed >= effectiveSeatLimit) {
          return { seatFull: true as const };
        }
      }

      await tx.lmsTeamMember.upsert({
        where: {
          teamId_userId: { teamId: invite.teamId, userId: claims.sub },
        },
        create: {
          teamId: invite.teamId,
          userId: claims.sub,
          role: invite.role,
        },
        update: { role: invite.role },
      });
      await tx.lmsTeamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return { seatFull: false as const };
    });

    if (result.seatFull) {
      return NextResponse.json(
        teamSub
          ? {
              detail: 'This team has no seats left. Ask the owner to add seats.',
              reason: 'seat_full',
            }
          : { detail: 'Team is full' },
        { status: 409 },
      );
    }

    try {
      await enrollTeamMemberInPurchasedCourse(claims.sub, invite.teamId);
    } catch (enrollErr) {
      console.error('[teams/invite/accept] enrol', enrollErr);
    }

    return NextResponse.json({
      team_id: invite.teamId,
      team_slug: invite.team.slug,
      team_name: invite.team.name,
    });
  } catch (e) {
    console.error('[teams/invite/accept]', e);
    return NextResponse.json({ detail: 'Failed to accept invite' }, { status: 500 });
  }
}
