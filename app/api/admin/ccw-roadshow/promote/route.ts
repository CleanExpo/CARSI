import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  promoteRegistration,
  setRegistrationCalendarSynced,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import { sendAndLogRoadshowEmail } from '@/lib/server/ccw-roadshow-email-log';
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

    // The promotion itself has committed. The side effects below must never undo
    // it — but their outcome IS reported back so the admin knows whether the
    // attendee was actually told. Previously this was swallowed entirely.
    let emailSent = false;
    let emailReason: string | undefined;
    let calendarSynced = false;

    try {
      const registration = await prisma.ccwRoadshowRegistration.findUnique({
        where: { id: body.registrationId },
        include: { attendees: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      if (registration) {
        calendarSynced = await addRegistrationToCalendar({
          calendarEventId: event.calendarEventId,
          attendeeEmail: registration.contactEmail,
        });
        if (calendarSynced) {
          await setRegistrationCalendarSynced(body.registrationId);
        }

        // sendAndLogRoadshowEmail never throws and records every attempt.
        const outcome = await sendAndLogRoadshowEmail({
          registrationId: registration.id,
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
        emailSent = outcome.sent;
        emailReason = outcome.reason;
      }
    } catch (sideEffectErr) {
      console.error('[ccw-roadshow-promote] post-promotion side effects failed (non-fatal):', sideEffectErr);
      emailReason = 'side_effects_threw';
    }

    // emailSent=false means: promoted, but the attendee was NOT told.
    return NextResponse.json({ ...result, emailSent, emailReason, calendarSynced });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_ENOUGH_CAPACITY') {
      return NextResponse.json({ detail: 'Not enough capacity to promote this party.' }, { status: 409 });
    }
    console.error('[ccw-roadshow-promote] error:', error);
    return NextResponse.json({ detail: 'Failed to promote registration.' }, { status: 500 });
  }
}
