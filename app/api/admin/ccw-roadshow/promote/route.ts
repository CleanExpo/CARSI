import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  promoteRegistration,
  setRegistrationCalendarSynced,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    registrationId?: string;
    eventSlug?: string;
  };
  const event = getCcwRoadshowEvent(body.eventSlug);
  if (!body.registrationId || !event) {
    return NextResponse.json({ detail: 'registrationId and a valid eventSlug are required.' }, { status: 400 });
  }

  try {
    const result = await promoteRegistration(body.registrationId, event);

    const registration = await prisma.ccwRoadshowRegistration.findUnique({
      where: { id: body.registrationId },
    });
    if (registration) {
      const synced = await addRegistrationToCalendar({
        calendarEventId: event.calendarEventId,
        attendeeEmail: registration.contactEmail,
      });
      if (synced) {
        await setRegistrationCalendarSynced(body.registrationId);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_ENOUGH_CAPACITY') {
      return NextResponse.json({ detail: 'Not enough capacity to promote this party.' }, { status: 409 });
    }
    console.error('[ccw-roadshow-promote] error:', error);
    return NextResponse.json({ detail: 'Failed to promote registration.' }, { status: 500 });
  }
}
