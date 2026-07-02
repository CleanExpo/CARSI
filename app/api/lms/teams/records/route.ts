import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getTeamTrainingRecordsForOwner, teamRecordsToCsv } from '@/lib/server/team-records';

/**
 * GET /api/lms/teams/records — the team owner's (supervisor's) training records for their
 * whole team. `?format=csv` returns the compliance export as a CSV download.
 * Owner-only: non-owners get 403; users without a team get 404.
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ records: null });
  }

  try {
    const result = await getTeamTrainingRecordsForOwner(claims.sub);
    if (result === 'no_team') {
      return NextResponse.json({ detail: 'No team found' }, { status: 404 });
    }
    if (result === 'forbidden') {
      return NextResponse.json(
        { detail: 'Only the team owner can view team training records' },
        { status: 403 }
      );
    }

    const format = request.nextUrl.searchParams.get('format');
    if (format === 'csv') {
      const csv = teamRecordsToCsv(result);
      const safeName = result.teamName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'team';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}-training-records.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ records: result });
  } catch (e) {
    console.error('[teams/records]', e);
    return NextResponse.json({ detail: 'Failed to load team training records' }, { status: 500 });
  }
}
