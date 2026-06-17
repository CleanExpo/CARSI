import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import {
  ccwRoadshowPath,
  getCcwRoadshowEvent,
  getCcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';

type RoadshowCheckoutBody = {
  eventSlug?: string;
  packageId?: string;
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

    if (!fullName) {
      return NextResponse.json({ detail: 'Name is required.' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ detail: 'A valid email is required.' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { detail: 'Payments are not configured yet. Set STRIPE_SECRET_KEY to enable bookings.' },
        { status: 503 },
      );
    }

    const origin = request.nextUrl.origin;
    const successUrl = `${origin}${ccwRoadshowPath}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${ccwRoadshowPath}?event=${event.slug}`;
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      phone_number_collection: { enabled: true },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        source: 'carsi-ccw-roadshow',
        event_slug: event.slug,
        event_city: event.city,
        event_dates: event.dates,
        ticket_package: ticketPackage.id,
        attendee_count: String(ticketPackage.attendeeCount),
        attendee_name: fullName,
        business_name: businessName,
        phone,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: ticketPackage.unitAmountCents,
            product_data: {
              name: `${event.title} - ${ticketPackage.label}`,
              description: `${event.dateRangeLabel}, ${event.timeLabel}. ${event.venueName}. ${ticketPackage.description}`,
              metadata: {
                event_slug: event.slug,
                ticket_package: ticketPackage.id,
              },
            },
          },
        },
      ],
    });

    if (!session.url) {
      return NextResponse.json({ detail: 'Stripe did not return a checkout URL.' }, { status: 500 });
    }

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Stripe secret key not configured')) {
      return NextResponse.json({ detail: 'STRIPE_SECRET_KEY is not set.' }, { status: 503 });
    }
    console.error('[ccw-roadshow-checkout] error:', error);
    return NextResponse.json({ detail: 'Failed to start event checkout.' }, { status: 500 });
  }
}
