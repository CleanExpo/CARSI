import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { listReviewQueue } from '@/lib/server/practical-assessment';

export const dynamic = 'force-dynamic';

/** GET /api/admin/practical-assessments/review-queue — pending/under-review submissions (GP-457). */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }
  try {
    const queue = await listReviewQueue();
    return NextResponse.json({ queue });
  } catch (e) {
    console.error('[admin/practical-assessments/review-queue]', e);
    return NextResponse.json({ detail: 'Failed to load review queue' }, { status: 500 });
  }
}
