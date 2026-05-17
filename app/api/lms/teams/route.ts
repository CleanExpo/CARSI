import { type NextRequest, NextResponse } from 'next/server';

import { teamTierById, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { createTeamForOwner, getTeamForUser } from '@/lib/server/teams';

const VALID_TIERS: TeamBundleTierId[] = ['starter', 'growth', 'full_library'];

/** POST /api/lms/teams — create a team (MVP; billing wired in Phase 3). */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  let body: { name?: string; bundle_tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const tier = body.bundle_tier as TeamBundleTierId;
  if (!name || name.length < 2) {
    return NextResponse.json({ detail: 'Team name is required' }, { status: 400 });
  }
  if (!VALID_TIERS.includes(tier) || !teamTierById(tier)) {
    return NextResponse.json({ detail: 'Invalid bundle tier' }, { status: 400 });
  }

  try {
    const existing = await getTeamForUser(claims.sub);
    if (existing) {
      return NextResponse.json(
        { detail: 'You already belong to a team', team_slug: existing.slug },
        { status: 409 }
      );
    }

    const team = await createTeamForOwner({
      ownerId: claims.sub,
      name,
      bundleTier: tier,
    });

    return NextResponse.json({ id: team.id, slug: team.slug }, { status: 201 });
  } catch (e) {
    console.error('[teams POST]', e);
    return NextResponse.json({ detail: 'Failed to create team' }, { status: 500 });
  }
}
