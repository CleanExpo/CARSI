import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLearnerLevelPayload } from '@/lib/server/learner-xp';

/** GET /api/lms/gamification/me/level — real XP from lesson/course progress (Phase 1). */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      total_xp: 0,
      current_level: 1,
      level_title: 'Getting started',
      current_streak: 0,
      longest_streak: 0,
      xp_to_next_level: 100,
      total_cec_lifetime: 0,
    });
  }

  try {
    const payload = await getLearnerLevelPayload(claims.sub);
    return NextResponse.json(payload);
  } catch (e) {
    console.error('[gamification/me/level]', e);
    return NextResponse.json({ detail: 'Failed to load level' }, { status: 500 });
  }
}
