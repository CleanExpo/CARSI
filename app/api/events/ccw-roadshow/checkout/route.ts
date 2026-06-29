import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import {
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowPath,
  getCcwRoadshowEvent,
  getCcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';
import { emitCrmEvent } from '@/lib/server/crm-sync';

type RoadshowCheckoutBody = {
  eventSlug?: string;
  packageId?: string;
  ccwCustomerStatus?: string;
  fullName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
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

    const fullName = clean(body.fullName, 120);
    const businessName = clean(body.businessName, 160);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 80);
    const ccwCustomerStatus = clean(body.ccwCustomerStatus, 40) || 'not_sure';

    if (!fullName) {
      return NextResponse.json({ detail: 'Name is required.' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ detail: 'A valid email is required.' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const freeEntryToken = generateFreeEntryToken(event.slug);
    const successParams = new URLSearchParams({
      token: freeEntryToken,
      event: event.slug,
      city: event.city,
      dates: event.dates,
      seats: String(ticketPackage.attendeeCount),
    });
    const bookingUrl = `${origin}${ccwRoadshowPath}/success?${successParams.toString()}`;

    await emitCrmEvent('roadshow.registration.created', {
      source: 'carsi-ccw-roadshow',
      free_entry_token: freeEntryToken,
      event_slug: event.slug,
      event_city: event.city,
      event_dates: event.dates,
      ticket_package: ticketPackage.id,
      attendee_count: ticketPackage.attendeeCount,
      attendee_name: fullName,
      business_name: businessName,
      email,
      phone,
      ccw_customer_status: ccwCustomerStatus,
      amount_cents: 0,
      currency: 'AUD',
      registration_url: bookingUrl,
    });

    return NextResponse.json({
      booking_url: bookingUrl,
      free_entry_token: freeEntryToken,
    });
  } catch (error) {
    console.error('[ccw-roadshow-registration] error:', error);
    return NextResponse.json({ detail: 'Failed to reserve free event entry.' }, { status: 500 });
  }
}
