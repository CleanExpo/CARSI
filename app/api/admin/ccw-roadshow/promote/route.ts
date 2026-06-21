import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  promoteRegistration,
  setRegistrationCalendarSynced,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import { sendCcwRoadshowRegistrationEmail } from '@/lib/server/transactional-email';
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

    try {
      const registration = await prisma.ccwRoadshowRegistration.findUnique({
        where: { id: body.registrationId },
        include: { attendees: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      if (registration) {
        const synced = await addRegistrationToCalendar({
          calendarEventId: event.calendarEventId,
          attendeeEmail: registration.contactEmail,
        });
        if (synced) {
          await setRegistrationCalendarSynced(body.registrationId);
        }

        try {
          await sendCcwRoadshowRegistrationEmail({
            to: registration.contactEmail,
            kind: 'promoted',
            attendeeName: registration.attendees[0]?.fullName ?? 'there',
            eventCity: event.city,
            dateRangeLabel: event.dateRangeLabel,
            timeLabel: event.timeLabel,
            venueName: event.venueName,
            venueAddress: `${event.streetAddress}, ${event.suburbStatePostcode}`,
            seatCount: registration.seatCount,
            freeEntryToken: registration.freeEntryToken,
            appOrigin: request.nextUrl.origin,
          });
        } catch (emailErr) {
          console.error('[ccw-roadshow-promote] promotion email failed (non-fatal):', emailErr);
        }
      }
    } catch (sideEffectErr) {
      console.error('[ccw-roadshow-promote] post-promotion side effects failed (non-fatal):', sideEffectErr);
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
