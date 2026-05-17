import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { countTeamSeatsUsed, getTeamForUser } from '@/lib/server/teams';

/** GET /api/lms/teams/me — current user's team membership. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ team: null });
  }

  try {
    const team = await getTeamForUser(claims.sub);
    if (!team) {
      return NextResponse.json({ team: null });
    }

    const seatsUsed = await countTeamSeatsUsed(team.id);

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        bundle_tier: team.bundleTier,
        seat_limit: team.seatLimit,
        seats_used: seatsUsed,
        owner_id: team.ownerId,
        is_owner: team.ownerId === claims.sub,
        members: team.members.map((m) => ({
          user_id: m.userId,
          role: m.role,
          email: m.user.email,
          full_name: m.user.fullName,
        })),
        pending_invites: team.invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expires_at: i.expiresAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error('[teams/me]', e);
    return NextResponse.json({ detail: 'Failed to load team' }, { status: 500 });
  }
}
