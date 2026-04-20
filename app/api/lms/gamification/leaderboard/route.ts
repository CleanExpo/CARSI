import { NextRequest, NextResponse } from 'next/server';

import {
  getMonthlyLeaderboard,
  leaderboardPeriodLabelNow,
} from '@/lib/server/leaderboard-xp';

const DISCIPLINES = new Set(['WRT', 'OCT', 'AMRT', 'FSRT', 'CRT', 'CCT', 'ASD']);

function parseDiscipline(raw: string | null): string | null {
  if (!raw || raw === '' || raw.toLowerCase() === 'all') return null;
  const u = raw.trim().toUpperCase();
  return DISCIPLINES.has(u) ? u : null;
}

/**
 * Public monthly leaderboard (Australia/Sydney calendar month).
 * Rankings use XP from lesson + course completions in the selected period (optional IICRC discipline filter).
 * Display names are anonymous unless the learner opts in from their profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('discipline');
  const discipline = parseDiscipline(requested);

  if (requested && requested !== '' && requested.toLowerCase() !== 'all' && !discipline) {
    return NextResponse.json(
      {
        detail: 'Invalid discipline. Use WRT, OCT, AMRT, FSRT, CRT, CCT, ASD, or omit for all.',
      },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      period_label: leaderboardPeriodLabelNow(),
      period_timezone: 'Australia/Sydney',
      discipline,
      items: [],
    });
  }

  try {
    const { period_label, period_timezone, items } = await getMonthlyLeaderboard({
      discipline,
      limit: 20,
    });
    return NextResponse.json({
      period_label,
      period_timezone,
      discipline,
      items,
    });
  } catch (e) {
    console.error('[leaderboard]', e);
    return NextResponse.json({ detail: 'Could not load leaderboard.' }, { status: 500 });
  }
}
