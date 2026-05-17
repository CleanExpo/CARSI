import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCohortAnalytics } from '@/lib/server/cohort-analytics';

/** GET /api/admin/analytics/cohorts — B2B completion and enrollment cohorts (Phase 3). */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  try {
    const data = await getCohortAnalytics();
    return NextResponse.json(data);
  } catch (e) {
    console.error('[admin/analytics/cohorts]', e);
    return NextResponse.json({ detail: 'Failed to load analytics' }, { status: 500 });
  }
}
