import { NextResponse } from 'next/server';

import { runToolboxDrip } from '@/lib/server/toolbox-drip';

/**
 * Phase C — monthly Toolbox-Talk drip.
 *
 * Picks this month's talk (rotating over the Toolbox-Talks course modules) and notifies every
 * active drip-course enrollee in-app + email (email respects the Spam-Act opt-out). Idempotent per
 * user/month/talk. Wire to a scheduler hitting this on the 1st with `Authorization: Bearer $CRON_SECRET`
 * (see .github/workflows/notifications-toolbox-drip.yml).
 */
export async function GET(request: Request) {
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
  const result = await runToolboxDrip(now);
  return NextResponse.json({ ok: true, ...result, timestamp: now.toISOString() });
}
