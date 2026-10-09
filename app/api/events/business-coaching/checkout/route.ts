import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/server/turnstile';

import {
    getBusinessCoachingPackage,
    getBusinessCoachingSession,
} from '@/lib/marketing/business-coaching';
import { getAppOrigin } from '@/lib/server/app-url';
import { createBusinessCoachingCheckoutSession } from '@/lib/server/business-coaching-checkout';
import { isBusinessCoachingEnabled } from '@/lib/server/business-coaching-flag';
import { getBusinessCoachingAvailability } from '@/lib/server/business-coaching-registry';
import { isMissingTableError } from '@/lib/server/db-errors';

type CheckoutBody = {
  sessionSlug?: string;
  packageId?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  attendees?: { fullName?: string }[];
  discussionTopic?: string;
  turnstileToken?: string;
};

const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function clean(value: unknown, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  if (!isBusinessCoachingEnabled()) {
    return NextResponse.json({ detail: 'Owner Circle bookings are paused.' }, { status: 503 });
  }

  try {
    const ip = clientIpFrom(
      request.headers.get('x-forwarded-for'),
      request.headers.get('x-real-ip'),
    );
    const rateLimit = applyRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { detail: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
      );
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstile.ok) {
      return NextResponse.json({ detail: 'Security verification failed.' }, { status: 403 });
    }

    const session = getBusinessCoachingSession(body.sessionSlug);
    const pkg = getBusinessCoachingPackage(body.packageId);
    if (!session || !pkg) {
      return NextResponse.json({ detail: 'Select a valid session and ticket.' }, { status: 400 });
    }

    const contactEmail = clean(body.contactEmail, 160).toLowerCase();
    if (!contactEmail || !isValidEmail(contactEmail)) {
      return NextResponse.json({ detail: 'A valid email is required.' }, { status: 400 });
    }

    const companyName = clean(body.companyName, 160);
    const contactPhone = clean(body.contactPhone, 80);
    const discussionTopic = clean(body.discussionTopic, 400);

    const rawAttendees = Array.isArray(body.attendees) ? body.attendees : [];
    if (rawAttendees.length !== pkg.attendeeCount) {
      return NextResponse.json(
        { detail: `Provide exactly ${pkg.attendeeCount} attendee name(s).` },
        { status: 400 },
      );
    }

    const attendees: { fullName: string }[] = [];
    for (const raw of rawAttendees) {
      const fullName = clean(raw.fullName, 120);
      if (!fullName) {
        return NextResponse.json({ detail: 'Each attendee needs a name.' }, { status: 400 });
      }
      attendees.push({ fullName });
    }

    try {
      const availability = await getBusinessCoachingAvailability(session.slug, session.capacity);
      if (availability.remaining < pkg.attendeeCount) {
        return NextResponse.json(
          {
            detail:
              availability.isFull
                ? 'This session is full. Pick another month or join the waitlist after payment if seats open.'
                : `Only ${availability.remaining} seat(s) left — choose a smaller package or another date.`,
          },
          { status: 409 },
        );
      }
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      console.warn(
        '[business-coaching] registry tables missing — skipping cap check. Run prisma migrate deploy.',
      );
    }

    const origin = getAppOrigin(request);
    const checkout = await createBusinessCoachingCheckoutSession({
      sessionSlug: session.slug,
      packageId: pkg.id,
      companyName,
      contactEmail,
      contactPhone,
      attendees,
      discussionTopic,
      appOrigin: origin,
    });

    return NextResponse.json({
      checkout_url: checkout.checkout_url,
      checkout_session_id: checkout.checkout_session_id,
    });
  } catch (error) {
    console.error('[business-coaching-checkout] error:', error);
    const message =
      error instanceof Error && error.message === 'INVALID_SESSION_OR_PACKAGE'
        ? 'Select a valid session and ticket.'
        : 'Could not start checkout. Check Stripe configuration or try again.';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
