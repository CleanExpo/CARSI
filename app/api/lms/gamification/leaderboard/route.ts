import { NextRequest, NextResponse } from 'next/server';

import { getDesignationDefinition } from '@/lib/designations/registry';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getMonthlyLeaderboard, leaderboardPeriodLabelNow } from '@/lib/server/leaderboard-xp';

/**
 * Monthly leaderboard (Australia/Sydney calendar month), for signed-in learners only.
 * Rankings use XP from lesson + course completions in the selected period, optionally limited to
 * one CARSI designation's pathway courses (`?designation=<slug>`). It never filters or labels by
 * an IICRC discipline code. Only learners who opted in from their profile are ranked (GP-775), under
 * their chosen label or an anonymous one; a real name or email is never returned.
 */
export async function GET(request: NextRequest) {
  // The only consumer is the signed-in Achievements page; nobody needs an anonymous public board.
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // A filter key that is present always counts, whatever its value: an empty or bare key must
  // not fall through to the unfiltered board.
  const requested = searchParams.has('designation')
    ? (searchParams.get('designation') ?? '').trim()
    : null;
  const designation = requested ? getDesignationDefinition(requested) : null;

  if (searchParams.has('discipline') || (requested !== null && !designation)) {
    return NextResponse.json(
      {
        detail:
          'Unknown filter. Use designation=<CARSI designation slug> (for example carsi-water-restoration-practitioner), or omit it for all courses.',
      },
      { status: 400 }
    );
  }

  const slug = designation?.slug ?? null;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      period_label: leaderboardPeriodLabelNow(),
      period_timezone: 'Australia/Sydney',
      designation: slug,
      items: [],
      // No data source: say so, so the page never presents it as an empty month (GP-775 r1).
      unavailable: true,
    });
  }

  try {
    const { period_label, period_timezone, items } = await getMonthlyLeaderboard({
      courseSlugs: designation ? designation.pathwaySteps.map((s) => s.courseSlug) : null,
      limit: 20,
    });
    return NextResponse.json({
      period_label,
      period_timezone,
      designation: slug,
      items,
    });
  } catch (e) {
    console.error('[leaderboard]', e);
    // Fail open for dashboard UX: show an empty board instead of a hard error.
    return NextResponse.json({
      period_label: leaderboardPeriodLabelNow(),
      period_timezone: 'Australia/Sydney',
      designation: slug,
      items: [],
      unavailable: true,
    });
  }
}
