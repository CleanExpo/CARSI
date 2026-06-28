import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import {
  getRoadshowRegistrationForCalendarSync,
  setRegistrationCalendarSynced,
} from '@/lib/server/ccw-roadshow-registry';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { registrationId?: string };
  const registrationId = body.registrationId?.trim();
  if (!registrationId) {
    return NextResponse.json({ detail: 'registrationId is required.' }, { status: 400 });
  }

  try {
    const registration = await getRoadshowRegistrationForCalendarSync(registrationId);
    if (!registration) {
      return NextResponse.json({ detail: 'Registration not found.' }, { status: 404 });
    }

    const event = getCcwRoadshowEvent(registration.eventSlug);
    if (!event) {
      return NextResponse.json({ detail: 'Registration event is no longer configured.' }, { status: 409 });
    }

    if (registration.status !== 'confirmed') {
      return NextResponse.json(
        { detail: 'Only confirmed registrations can be synced to Google Calendar.' },
        { status: 409 },
      );
    }

    const synced = await addRegistrationToCalendar({
      calendarEventId: event.calendarEventId,
      attendeeEmail: registration.contactEmail,
    });

    if (!synced) {
      return NextResponse.json({ detail: 'Google Calendar sync failed.' }, { status: 502 });
    }

    await setRegistrationCalendarSynced(registrationId);
    return NextResponse.json({ ok: true, calendarSynced: true });
  } catch (error) {
    console.error('[admin/ccw-roadshow/sync-calendar] sync failed:', error);
    return NextResponse.json({ detail: 'Failed to sync registration to calendar.' }, { status: 500 });
  }
}
