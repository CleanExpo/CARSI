import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getReviewFunnelSummary } from '@/lib/server/review-summary';

/**
 * GET /api/admin/reviews/summary — review-ask funnel and moderation audit (spec 2026-10-18 D13).
 * Completions, open asks, reviews, email outcomes, hides by reason and star rating (a run of
 * hidden 1-2 star reviews is how a curated rating would show), and the Google link status.
 */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }
  try {
    return NextResponse.json(await getReviewFunnelSummary());
  } catch (e) {
    console.error('[admin/reviews/summary]', e);
    return NextResponse.json({ detail: 'Failed to load review summary' }, { status: 500 });
  }
}
