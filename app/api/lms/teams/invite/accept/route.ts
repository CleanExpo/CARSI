import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { enrollTeamMemberInPurchasedCourse } from '@/lib/server/team-course-purchase';
import { countTeamSeatsUsed } from '@/lib/server/teams';

/** POST /api/lms/teams/invite/accept — accept invite token. */
export async function POST(request: NextRequest) {
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

    const seatsUsed = await countTeamSeatsUsed(invite.teamId);
    if (seatsUsed >= invite.team.seatLimit) {
      return NextResponse.json({ detail: 'Team is full' }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.lmsTeamMember.upsert({
        where: {
          teamId_userId: { teamId: invite.teamId, userId: claims.sub },
        },
        create: {
          teamId: invite.teamId,
          userId: claims.sub,
          role: invite.role,
        },
        update: { role: invite.role },
      }),
      prisma.lmsTeamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await enrollTeamMemberInPurchasedCourse(claims.sub, invite.teamId);

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
