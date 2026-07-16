import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { getAppOrigin } from '@/lib/server/app-url';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import { runCcwOfferPackBatch } from '@/lib/server/ccw-attendance/offer-pack';

/**
 * POST /api/admin/ccw-roadshow/offer-pack — send post-event offer emails for
 * one event (both days + email opt-in + provisioned; idempotent via
 * offerEmailSentAt). Admin-only; dark behind CCW_ATTENDANCE_ENABLED.
 *
 * Body: { eventSlug: string }
 */
export async function POST(request: NextRequest) {
  if (!isCcwAttendanceEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'Expected application/json' }, { status: 415 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { eventSlug?: string };
  const event = getCcwRoadshowEvent(body.eventSlug);
  if (!event) {
    return NextResponse.json({ detail: 'A valid eventSlug is required.' }, { status: 400 });
  }

  try {
    const summary = await runCcwOfferPackBatch(event.slug, {
      appOrigin: getAppOrigin(request),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error('[ccw-roadshow/offer-pack]', e);
    return NextResponse.json({ detail: 'Offer pack batch failed' }, { status: 500 });
  }
}
