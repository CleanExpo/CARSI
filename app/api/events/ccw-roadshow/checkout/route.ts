import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import {
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowPath,
  getCcwRoadshowEvent,
  getCcwRoadshowTicketPackage,
  isValidExperienceBand,
} from '@/lib/marketing/ccw-roadshow';
import { emitCrmEvent } from '@/lib/server/crm-sync';
import {
  createRoadshowRegistration,
  setRegistrationCalendarSynced,
  type AttendeeInput,
} from '@/lib/server/ccw-roadshow-registry';
import { addRegistrationToCalendar } from '@/lib/server/ccw-roadshow-calendar';
import { isMissingTableError } from '@/lib/server/db-errors';
import { getAppOrigin } from '@/lib/server/app-url';
import {
  sendCcwRoadshowRegistrationEmail,
  sendCcwRoadshowOrganizerNotificationEmail,
} from '@/lib/server/transactional-email';
import { getRoadshowNotifyRecipients } from '@/lib/server/ccw-roadshow-notify';

type AttendeeBody = { fullName?: string; yearsExperience?: string; goals?: string };
type RoadshowCheckoutBody = {
  eventSlug?: string;
  packageId?: string;
  ccwCustomerStatus?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  attendees?: AttendeeBody[];
};

function clean(value: unknown, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getEventTokenCode(eventSlug: string) {
  return eventSlug.trim().slice(0, 3).toUpperCase();
}

function generateFreeEntryToken(eventSlug: string) {
  const eventCode = getEventTokenCode(eventSlug);
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `${ccwRoadshowFreeEntryOffer.tokenPrefix}-${eventCode}-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RoadshowCheckoutBody;
    const event = getCcwRoadshowEvent(body.eventSlug);
    const ticketPackage = getCcwRoadshowTicketPackage(body.packageId);

    if (!event) {
      return NextResponse.json({ detail: 'Select a valid roadshow event.' }, { status: 400 });
    }
    if (!ticketPackage) {
      return NextResponse.json({ detail: 'Select a valid ticket package.' }, { status: 400 });
    }

    const companyName = clean(body.companyName, 160);
    const contactEmail = clean(body.contactEmail, 160).toLowerCase();
    const contactPhone = clean(body.contactPhone, 80);
    const ccwCustomerStatus = clean(body.ccwCustomerStatus, 40) || 'not_sure';

    if (!contactEmail || !isValidEmail(contactEmail)) {
      return NextResponse.json({ detail: 'A valid contact email is required.' }, { status: 400 });
    }

    const rawAttendees = Array.isArray(body.attendees) ? body.attendees : [];
    if (rawAttendees.length < 1 || rawAttendees.length > ticketPackage.attendeeCount) {
      return NextResponse.json(
        { detail: `Provide between 1 and ${ticketPackage.attendeeCount} attendees.` },
        { status: 400 },
      );
    }

    const attendees: AttendeeInput[] = [];
    for (const raw of rawAttendees) {
      const fullName = clean(raw.fullName, 120);
      const yearsExperience = clean(raw.yearsExperience, 16);
      const goals = clean(raw.goals, 600);
      if (!fullName) {
        return NextResponse.json({ detail: 'Each attendee needs a name.' }, { status: 400 });
      }
      if (!isValidExperienceBand(yearsExperience)) {
        return NextResponse.json({ detail: 'Select years of experience for each attendee.' }, { status: 400 });
      }
      if (!goals) {
        return NextResponse.json({ detail: 'Each attendee must share what they want to achieve.' }, { status: 400 });
      }
      attendees.push({ fullName, yearsExperience, goals });
    }

    const freeEntryToken = generateFreeEntryToken(event.slug);

    let result;
    try {
      result = await createRoadshowRegistration({
        event,
        companyName,
        contactEmail,
        contactPhone,
        ccwCustomerStatus,
        attendees,
        freeEntryToken,
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        // Registry tables not migrated yet — degrade gracefully: still issue a
        // token (and fire CRM + email below) so registration works, just
        // without persistence/caps. Full caps/waitlist resume once
        // `prisma migrate deploy` has run.
        console.warn(
          '[ccw-roadshow] registry tables missing — issued a token without persistence/caps. Run prisma migrate deploy.',
        );
        result = {
          registrationId: '',
          status: 'confirmed' as const,
          seatCount: attendees.length,
          remaining: event.capacity,
        };
      } else {
        throw error;
      }
    }

    if (result.status === 'confirmed') {
      const synced = await addRegistrationToCalendar({
        calendarEventId: event.calendarEventId,
        attendeeEmail: contactEmail,
      });
      if (synced && result.registrationId) {
        await setRegistrationCalendarSynced(result.registrationId);
      }
    }

    const origin = getAppOrigin(request);
    const successParams = new URLSearchParams({
      token: freeEntryToken,
      event: event.slug,
      city: event.city,
      dates: event.dates,
      seats: String(result.seatCount),
      status: result.status,
    });
    const bookingUrl = `${origin}${ccwRoadshowPath}/success?${successParams.toString()}`;

    await emitCrmEvent('roadshow.registration.created', {
      source: 'carsi-ccw-roadshow',
      free_entry_token: freeEntryToken,
      event_slug: event.slug,
      event_city: event.city,
      event_dates: event.dates,
      ticket_package: ticketPackage.id,
      attendee_count: result.seatCount,
      registration_status: result.status,
      company_name: companyName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      ccw_customer_status: ccwCustomerStatus,
      attendees: attendees.map((a) => ({
        name: a.fullName,
        years_experience: a.yearsExperience,
        goals: a.goals,
      })),
      amount_cents: 0,
      currency: 'AUD',
      registration_url: bookingUrl,
    });

    try {
      await sendCcwRoadshowRegistrationEmail({
        to: contactEmail,
        kind: result.status === 'confirmed' ? 'confirmed' : 'waitlisted',
        attendeeName: attendees[0]?.fullName ?? 'there',
        eventCity: event.city,
        dateRangeLabel: event.dateRangeLabel,
        timeLabel: event.timeLabel,
        venueName: event.venueName,
        venueAddress: `${event.streetAddress}, ${event.suburbStatePostcode}`,
        seatCount: result.seatCount,
        freeEntryToken,
        appOrigin: origin,
      });
    } catch (emailErr) {
      console.error('[ccw-roadshow] registration email failed (non-fatal):', emailErr);
    }

    // Notify the campaign owner(s) for this city (Melbourne → Phill; Sydney → Toby + Phill).
    try {
      const notifyTo = getRoadshowNotifyRecipients(event.slug);
      if (notifyTo.length > 0) {
        await sendCcwRoadshowOrganizerNotificationEmail({
          to: notifyTo,
          eventCity: event.city,
          dateRangeLabel: event.dateRangeLabel,
          registrationStatus: result.status,
          seatCount: result.seatCount,
          freeEntryToken,
          companyName,
          contactEmail,
          contactPhone,
          attendees,
          appOrigin: origin,
        });
      }
    } catch (notifyErr) {
      console.error('[ccw-roadshow] organizer notification failed (non-fatal):', notifyErr);
    }

    return NextResponse.json({
      booking_url: bookingUrl,
      free_entry_token: freeEntryToken,
      status: result.status,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('[ccw-roadshow-registration] error:', error);
    return NextResponse.json({ detail: 'Failed to reserve free event entry.' }, { status: 500 });
  }
}
