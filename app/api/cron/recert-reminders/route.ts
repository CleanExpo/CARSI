import { NextResponse } from 'next/server';

import { runRecertReminders } from '@/lib/server/recert-reminders';

/**
 * Phase B — daily IICRC recertification reminders.
 *
 * Scans active users with an IICRC expiry date and creates idempotent in-app notifications (plus a
 * branded email) at T-30 / T-7 / overdue. Re-running is safe (dedupe key per milestone per cycle).
 * Wire to a scheduler hitting this daily with `Authorization: Bearer $CRON_SECRET`
 * (see .github/workflows/notifications-recert.yml).
 */
export async function GET(request: Request) {
  // Fail closed if the secret is unset — otherwise the header would match "Bearer undefined".
  if (!process.env.CRON_SECRET) {
    return new NextResponse('Cron not configured', { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, dispatched: 0, reason: 'no_database' });
  }

  const now = new Date();
  const result = await runRecertReminders(now);
  return NextResponse.json({ ok: true, ...result, timestamp: now.toISOString() });
}
