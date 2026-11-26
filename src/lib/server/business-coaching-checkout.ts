import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import {
  checkoutRequestIdempotencyKey,
  COURSE_CHECKOUT_MAX_NETWORK_RETRIES,
} from '@/lib/server/checkout-idempotency';
import {
    businessCoachingPath,
    businessCoachingProductName,
    businessCoachingSeatPriceCents,
    getBusinessCoachingPackage,
    getBusinessCoachingSession,
    type BusinessCoachingSession,
} from '@/lib/marketing/business-coaching';

export const BUSINESS_COACHING_CHECKOUT_SOURCE = 'carsi-business-coaching';

export type CreateBusinessCoachingCheckoutInput = {
  sessionSlug: string;
  packageId: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  attendees: { fullName: string }[];
  discussionTopic: string;
  appOrigin: string;
};

function cleanMeta(value: string, max = 500) {
  return value.trim().slice(0, max);
}

export async function createBusinessCoachingCheckoutSession(
  input: CreateBusinessCoachingCheckoutInput,
): Promise<{ checkout_url: string; checkout_session_id: string }> {
  const session = getBusinessCoachingSession(input.sessionSlug);
  const pkg = getBusinessCoachingPackage(input.packageId);
  if (!session || !pkg) {
    throw new Error('INVALID_SESSION_OR_PACKAGE');
  }
  if (input.attendees.length !== pkg.attendeeCount) {
    throw new Error('ATTENDEE_COUNT_MISMATCH');
  }

  const origin = input.appOrigin.replace(/\/$/, '');
  const successUrl = `${origin}${businessCoachingPath}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}${businessCoachingPath}?session=${encodeURIComponent(session.slug)}`;

  const stripe = getStripeClient();
  const request: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    customer_email: input.contactEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      source: BUSINESS_COACHING_CHECKOUT_SOURCE,
      session_slug: session.slug,
      package_id: pkg.id,
      company_name: cleanMeta(input.companyName, 160),
      contact_phone: cleanMeta(input.contactPhone, 80),
      discussion_topic: cleanMeta(input.discussionTopic, 400),
      attendee_1: cleanMeta(input.attendees[0]?.fullName ?? '', 120),
      ...(input.attendees[1] ? { attendee_2: cleanMeta(input.attendees[1].fullName, 120) } : {}),
    },
    line_items: [
      {
        quantity: pkg.attendeeCount,
        price_data: {
          currency: 'aud',
          unit_amount: businessCoachingSeatPriceCents,
          product_data: {
            name: `${businessCoachingProductName} — ${session.monthLabel}`,
            description: `${pkg.label} · ${session.dateLabel} · ${session.timeLabel}`,
          },
        },
      },
    ],
  };
  // GP-785: a double-click or a retry of the same booking gets the same Checkout Session.
  const stripeSession = await stripe.checkout.sessions.create(request, {
    idempotencyKey: checkoutRequestIdempotencyKey('business-coaching', request),
    maxNetworkRetries: COURSE_CHECKOUT_MAX_NETWORK_RETRIES,
  });

  const url = stripeSession.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url, checkout_session_id: stripeSession.id };
}

export function parseBusinessCoachingSessionFromMetadata(
  slug: string | null | undefined,
): BusinessCoachingSession | null {
  return getBusinessCoachingSession(slug);
}
