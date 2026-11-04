import { NextResponse } from 'next/server';

import { getAppOrigin } from '@/lib/server/app-url';
import { runAccountabilitySchedule } from '@/lib/server/carsi-coaching-accountability';
import { createAccountabilityMailer } from '@/lib/server/carsi-coaching-accountability-emails';
import {
  isCarsiCoachingAccountabilityEmailEnabled,
  isCarsiCoachingAccountabilityEnabled,
} from '@/lib/server/carsi-coaching-accountability-flag';
import { getAccountabilityStore } from '@/lib/server/carsi-coaching-accountability-store';
import { getCarsiCoachingMonthlyNotifyRecipients } from '@/lib/server/carsi-coaching-monthly-notify';
import { requireCron } from '@/lib/server/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * GP-635 — daily accountability run: fortnightly check-in prompts, due-soon and overdue action
 * reminders, the 14-day "you've been quiet" nudge, and coach alerts (silent 21 days, or two
 * blocked actions on one goal).
 *
 * - Feature flag off → does nothing.
 * - E-mail flag off (the default) → dry run: reports what would be sent, sends nothing,
 *   writes nothing.
 * - Both on → sends each reminder once (marked on the plan so a re-run never repeats it).
 * The report carries member ids and reminder kinds only. Scheduled daily by
 * .github/workflows/coaching-accountability.yml (GP-677).
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const now = new Date();
  if (!isCarsiCoachingAccountabilityEnabled()) {
    return NextResponse.json({ ok: true, enabled: false, planned: 0, sent: 0 });
  }
  if (!process.env.DATABASE_URL?.trim() && process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      ok: true,
      enabled: true,
      planned: 0,
      sent: 0,
      reason: 'no_database',
    });
  }

  const mailer = isCarsiCoachingAccountabilityEmailEnabled()
    ? createAccountabilityMailer({
        appOrigin: getAppOrigin(),
        coachRecipients: getCarsiCoachingMonthlyNotifyRecipients(),
      })
    : null;

  const result = await runAccountabilitySchedule(getAccountabilityStore(), now, mailer);
  return NextResponse.json({ ok: true, enabled: true, ...result, timestamp: now.toISOString() });
}
