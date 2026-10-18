import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { runReviewRequestEmails } from '@/lib/server/review-request-email';

/**
 * Review-request emails (spec 2026-10-18 D9-D12). DORMANT: sends nothing unless
 * REVIEW_REQUEST_EMAILS_ENABLED=true and REVIEW_REQUEST_EMAILS_SINCE is set. No workflow
 * schedules this route yet — that is added only once Phill approves sending.
 *
 * `?dry_run=1` counts who would be emailed without writing or sending anything.
 * Returns 500 when any send failed or email is not configured, so a scheduler's `curl -fsS`
 * goes red instead of reporting success. `reason: 'disabled'` is distinct from "nobody eligible".
 *
 * Stop sequence: unset REVIEW_REQUEST_EMAILS_ENABLED, then disable the scheduling workflow.
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_database' });
  }

  const now = new Date();
  const dryRun = new URL(request.url).searchParams.get('dry_run') === '1';
  try {
    const result = await runReviewRequestEmails({ now, dryRun });
    if (result.failed > 0) {
      console.error('[cron/review-requests] sends failed', {
        failed: result.failed,
        enrollment_ids: result.failed_enrollment_ids,
      });
    }
    return NextResponse.json({ ...result, timestamp: now.toISOString() }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    console.error('[cron/review-requests]', e);
    return NextResponse.json({ ok: false, detail: 'Review-request run failed' }, { status: 500 });
  }
}
