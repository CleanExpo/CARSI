import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  issueTeamMemberSeat,
  memberHoldsCourse,
  prepareTeamMemberSeat,
  runSeatStateStep,
  teamHasRoomForNewMember,
} from '@/lib/server/seat-state';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

/** POST /api/lms/teams/invite/accept — accept invite token. */
export async function POST(request: NextRequest) {
  // Membership-mutating route: gated behind the subscriptions flag for
  // consistency with the sibling Teams/org routes (teams/enroll, org/enroll, …).
  if (!teamSubscriptionsEnabled()) {
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

    // Teams SUBSCRIPTION teams (E2, GP-442) enforce the paid `LmsTeamSubscription.seatLimit`
    // (a 6th acceptance on a 5-seat plan is rejected, spec §15 #4); course-purchase teams count
    // only seats they paid for (GP-759); other teams count members.
    //
    // GP-759 (Phill, 23/11/2026): the seat checks and every write run in the one seat step, a
    // SERIALIZABLE transaction (seat-state.ts). Two acceptances, or an acceptance and a direct
    // invite, at the last seat cannot both commit: one is retried, sees the seat taken and gets
    // the same 409. The course seat is issued before the member row and the invite, so a member
    // with no paid seat is not left on the team and keeps the invite. An already-seated member
    // (idempotent re-accept) does not use a fresh team seat.
    const isSubscriptionTeam = invite.team.bundleTier === 'teams_subscription';
    const seat = await prepareTeamMemberSeat(claims.sub, invite.teamId);
    const result = await runSeatStateStep(async (tx) => {
      const existing = await tx.lmsTeamMember.findUnique({
        where: { teamId_userId: { teamId: invite.teamId, userId: claims.sub } },
        select: { userId: true },
      });
      // A learner who already holds the course through another payment takes no paid seat, so
      // the team's paid-seat limit does not apply to them (GP-759 follow-up, ruling 22/11/2026).
      const holdsCourse = seat ? await memberHoldsCourse(tx, seat) : false;
      if (!existing && !holdsCourse && !(await teamHasRoomForNewMember(tx, invite.teamId))) {
        return { seatFull: true as const };
      }
      if (seat && (await issueTeamMemberSeat(tx, seat)) === 'no_seat') {
        return { seatFull: true as const };
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
        isSubscriptionTeam
          ? {
              detail: 'This team has no seats left. Ask the owner to add seats.',
              reason: 'seat_full',
            }
          : { detail: 'Team is full' },
        { status: 409 },
      );
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
