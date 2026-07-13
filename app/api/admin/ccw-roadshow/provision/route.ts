import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { getAppOrigin } from '@/lib/server/app-url';
import { runCcwAttendanceBatch } from '@/lib/server/ccw-attendance/provision';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';

/**
 * POST /api/admin/ccw-roadshow/provision — run the async attendance batch for
 * one event: provision pending Day-1 sign-ins (account + 2-day-course enrol +
 * fire-and-forget welcome email) and finalise CEC for anyone now checked in both
 * days.
 *
 * Admin-only (`getAdminSessionOrNull`) AND dark behind `CCW_ATTENDANCE_ENABLED`
 * (404 when off). This is the DECOUPLED provisioning path — never the door-side
 * check-in route — so the DO→external egress that 504s can never block capture.
 *
 * Request JSON: { eventSlug: string }
 * Success 200: { ok: true; eventSlug; provision: {...}; cec: {...} }
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
    const summary = await runCcwAttendanceBatch(event.slug, {
      initiatedByAdminEmail: session.email,
      appOrigin: getAppOrigin(request),
    });
    return NextResponse.json({
      ok: true,
      eventSlug: event.slug,
      provision: summary.provision,
      cec: summary.cec,
    });
  } catch (e) {
    console.error('[ccw-roadshow/provision]', e);
    return NextResponse.json({ detail: 'Provisioning batch failed' }, { status: 500 });
  }
}
