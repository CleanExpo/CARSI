import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { resolveCurrentAdmin } from '@/lib/server/current-admin';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';
import { getReviewFunnelSummary } from '@/lib/server/review-summary';

/**
 * GET /api/admin/reviews/summary — review-ask funnel and moderation audit (spec 2026-10-18 D13).
 * Completions, open asks, reviews, hides by reason and star rating (a run of hidden 1-2 star
 * reviews is how a curated rating would show), and the Google link status.
 */
export async function GET() {
  const session = await readReviewAdminSession();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }
  try {
    // Includes hidden reviews and moderation reasons: the admin is re-checked in the database and
    // the summary is read INSIDE that transaction, while its FOR SHARE locks on the admin's rows
    // are held, so a demotion either commits first (and nothing private is read) or waits
    // (release-gate r9).
    const summary = await prisma.$transaction(async (tx) =>
      (await resolveCurrentAdmin(tx, session)) ? getReviewFunnelSummary(tx) : null
    );
    if (!summary) {
      return NextResponse.json({ detail: 'Only current admins can view this.' }, { status: 403 });
    }
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[admin/reviews/summary]', e);
    return NextResponse.json({ detail: 'Failed to load review summary' }, { status: 500 });
  }
}
