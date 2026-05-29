import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { serializeTeamForClient } from '@/lib/server/team-api-serialize';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

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
    const team = await repairAndGetTeamForUser(claims.sub);
    if (!team) {
      return NextResponse.json({ team: null });
    }

    return NextResponse.json({
      team: await serializeTeamForClient(team, claims.sub),
    });
  } catch (e) {
    console.error('[teams/me]', e);
    return NextResponse.json({ detail: 'Failed to load team' }, { status: 500 });
  }
}

/** PATCH /api/lms/teams/me — update team name (owner only). */
export async function PATCH(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2) {
    return NextResponse.json({ detail: 'Team name must be at least 2 characters' }, { status: 400 });
  }

  try {
    const team = await repairAndGetTeamForUser(claims.sub);
    if (!team || team.ownerId !== claims.sub) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.lmsTeam.update({
      where: { id: team.id },
      data: { name: name.slice(0, 80) },
      select: { name: true },
    });

    return NextResponse.json({ name: updated.name });
  } catch (e) {
    console.error('[teams/me PATCH]', e);
    return NextResponse.json({ detail: 'Failed to update team' }, { status: 500 });
  }
}
