/**
 * POST /api/lms/subscription/checkout — start the individual annual membership
 * (`pro_annual`, A$795/yr) Stripe Checkout in `mode: 'subscription'`.
 *
 * Optional body `{ attendeeOffer: true }` (or query from /subscribe?offer=ccw-attendee)
 * starts the CCW roadshow attendee special (A$295/yr) when the learner is
 * offer-eligible (both days + email opt-in + provisioned).
 *
 * Separate from the one-off course checkout (`/api/lms/checkout`, `mode:
 * 'payment'`) so the two flows never entangle. Ships DARK behind
 * SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain step.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import { CCW_ATTENDEE_OFFER_QUERY } from '@/lib/marketing/ccw-roadshow-offer-pack';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { learnerIsCcwAttendeeOfferEligible } from '@/lib/server/ccw-attendance/attendee-offer';
import {
  resolveAttendeeMembershipPricing,
  resolveProAnnualPriceId,
} from '@/lib/server/subscription-price';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Membership purchasing is not yet available.';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to start your membership.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
    attendeeOffer?: boolean;
    offer?: string;
  };

  const wantAttendeeOffer = body.attendeeOffer === true || body.offer === CCW_ATTENDEE_OFFER_QUERY;

  const origin = request.nextUrl.origin;
  const success_url =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : `${origin}/dashboard/courses?membership=active`;
  const cancel_url =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : `${origin}/subscribe?checkout=cancelled`;

  try {
    if (wantAttendeeOffer) {
      const eligible = await learnerIsCcwAttendeeOfferEligible({
        userId: claims.sub,
        email: claims.email,
      });
      if (!eligible) {
        return NextResponse.json(
          {
            detail:
              'This attendee membership special is only available after both training days and email opt-in.',
          },
          { status: 403 },
        );
      }

      const pricing = await resolveAttendeeMembershipPricing();
      if (!pricing) {
        return NextResponse.json(
          {
            detail:
              'Attendee membership pricing is not configured yet. Set STRIPE_PRICE_PRO_ANNUAL_ATTENDEE or STRIPE_COUPON_CCW_ATTENDEE.',
          },
          { status: 503 },
        );
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: pricing.priceId, quantity: 1 }],
        customer_email: claims.email,
        success_url,
        cancel_url,
        metadata: {
          carsi_user_id: claims.sub,
          plan: 'pro_annual_attendee',
          source: 'ccw-roadshow-offer',
        },
        subscription_data: {
          metadata: {
            carsi_user_id: claims.sub,
            plan: 'pro_annual_attendee',
            source: 'ccw-roadshow-offer',
          },
        },
      };

      if (pricing.kind === 'coupon') {
        sessionParams.discounts = [{ coupon: pricing.couponId }];
      } else {
        sessionParams.allow_promotion_codes = false;
      }

      const session = await getStripeClient().checkout.sessions.create(sessionParams);
      if (!session.url) {
        return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
      }
      return NextResponse.json({ url: session.url, checkout_url: session.url });
    }

    const priceId = await resolveProAnnualPriceId();
    if (!priceId) {
      return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
    }

    const session = await getStripeClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: claims.email,
      success_url,
      cancel_url,
      metadata: {
        carsi_user_id: claims.sub,
        plan: 'pro_annual',
        source: 'carsi-pro-annual',
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: { carsi_user_id: claims.sub, plan: 'pro_annual' },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url, checkout_url: session.url });
  } catch (error) {
    console.error('[subscription/checkout] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
