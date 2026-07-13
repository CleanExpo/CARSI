import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import {
  CHECKIN_TOKEN_TTL_SECONDS,
  eventDayStamp,
  mintCheckInToken,
  type CheckInDayIndex,
} from '@/lib/server/ccw-attendance/checkin-token';

/**
 * POST /api/admin/ccw-roadshow/checkin-token — mint the event-day check-in token
 * that backs the venue QR / self-service link.
 *
 * Admin-only (`getAdminSessionOrNull`) AND dark behind `CCW_ATTENDANCE_ENABLED`
 * (404 when off). A fresh token is minted per event per day (§12(c)); it is NOT
 * an admin session — it only authorises self-service sign-in POSTs for that
 * event on that calendar day.
 */
export async function POST(request: NextRequest) {
  if (!isCcwAttendanceEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  // Implicit CSRF defense on this cookie-authenticated admin POST — mirror the
  // sibling ccw-roadshow admin routes (sign-ins, provision).
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'Expected application/json' }, { status: 415 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventSlug?: string;
    dayIndex?: number;
  };

  const event = getCcwRoadshowEvent(body.eventSlug);
  const dayIndex: CheckInDayIndex | null =
    body.dayIndex === 1 ? 1 : body.dayIndex === 2 ? 2 : null;
  if (!event || dayIndex == null) {
    return NextResponse.json(
      { detail: 'A valid eventSlug and dayIndex (1 or 2) are required.' },
      { status: 400 },
    );
  }

  const dateStamp = eventDayStamp();
  const token = await mintCheckInToken({ eventSlug: event.slug, dayIndex, dateStamp });

  const checkInUrl = `${request.nextUrl.origin}/events/ccw-roadshow/checkin?event=${encodeURIComponent(
    event.slug,
  )}&day=${dayIndex}&t=${encodeURIComponent(token)}`;

  return NextResponse.json({
    ok: true,
    token,
    eventSlug: event.slug,
    dayIndex,
    dateStamp,
    checkInUrl,
    expiresInSeconds: CHECKIN_TOKEN_TTL_SECONDS,
  });
}
