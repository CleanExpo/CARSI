import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import { runReviewRequestEmails } from '@/lib/server/review-request-email';

/**
 * Review-request emails (spec 2026-10-18 D9-D12; header amendment 6). DORMANT: the switch
 * (lms_review_request_settings.enabled) is created OFF, and this route only sends to enrolments
 * the database marked eligible at completion while the switch was on. No workflow schedules this
 * route yet — that is added only once Phill approves sending.
 *
 * `?dry_run=1` counts who would be emailed without writing or sending anything.
 * Returns 500 when any send failed or email is not configured, so a scheduler's `curl -fsS`
 * goes red instead of reporting success. `reason: 'disabled'` is distinct from "nobody eligible".
 * Without a database the switch cannot even be read, so the route fails closed (503).
 *
 * Stop sequence: switch off via POST /api/admin/reviews/email-settings, then disable the workflow.
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return databaseUnavailableResponse('Review-request emails cannot run without a database.', {
      ok: false,
      sent: 0,
      reason: 'no_database',
    });
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
