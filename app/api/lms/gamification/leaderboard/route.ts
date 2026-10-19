import { NextRequest, NextResponse } from 'next/server';

import { getDesignationDefinition } from '@/lib/designations/registry';
import { getMonthlyLeaderboard, leaderboardPeriodLabelNow } from '@/lib/server/leaderboard-xp';

/**
 * Public monthly leaderboard (Australia/Sydney calendar month).
 * Rankings use XP from lesson + course completions in the selected period, optionally limited to
 * one CARSI designation's pathway courses (`?designation=<slug>`). It never filters or labels by
 * an IICRC discipline code. Display names are anonymous unless the learner opts in from their profile.
 */
export async function GET(request: NextRequest) {
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
