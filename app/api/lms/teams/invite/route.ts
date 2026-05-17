import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { countTeamSeatsUsed, generateInviteToken, getTeamForUser } from '@/lib/server/teams';

/** POST /api/lms/teams/invite — owner/admin invites a member by email. */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role === 'admin' ? 'admin' : 'member';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ detail: 'Valid email required' }, { status: 400 });
  }

  try {
    const team = await getTeamForUser(claims.sub);
    if (!team) {
      return NextResponse.json({ detail: 'No team found' }, { status: 404 });
    }

    const membership = team.members.find((m) => m.userId === claims.sub);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }

    const seatsUsed = await countTeamSeatsUsed(team.id);
    const pending = team.invites.length;
    if (seatsUsed + pending >= team.seatLimit) {
      return NextResponse.json({ detail: 'No seats available' }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = generateInviteToken();

    const invite = await prisma.lmsTeamInvite.create({
      data: {
        teamId: team.id,
        email,
        role,
        token,
        expiresAt,
      },
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      invite_url: `${appUrl}/teams/join?token=${token}`,
      expires_at: invite.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error('[teams/invite]', e);
    return NextResponse.json({ detail: 'Failed to create invite' }, { status: 500 });
  }
}
