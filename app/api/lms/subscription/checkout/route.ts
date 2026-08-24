/**
 * POST /api/lms/subscription/checkout — start the individual annual membership
 * (`pro_annual`, A$795/yr) Stripe Checkout in `mode: 'subscription'`.
 *
 * Optional body `{ attendeeOffer: true }` starts the CCW roadshow attendee
 * special when the learner is offer-eligible (both days + email opt-in +
 * provisioned): A$295 for the FIRST YEAR, then the standing A$795/yr.
 *
 * That first-year shape is the whole point (founder, 2026-08-24: A$795/yr is the
 * standing price, not a first-year one). It is delivered exactly as spec §10.3
 * requires — the SAME `pro_annual` recurring price every member pays, with a
 * server-side `duration: once` coupon taking the first invoice down. It is NOT a
 * discounted recurring price: that would renew at A$295 forever and quietly
 * commit CARSI to A$500/yr less from every attendee who ever claimed it.
 *
 * Regular $795 membership still ships dark behind SUBSCRIPTIONS_ENABLED.
 * The attendee path only needs STRIPE_SECRET_KEY (already used for payments).
 *
 * Both paths are guarded against opening a second checkout for a learner who
 * already holds a live membership (spec §10.4 AC-9) — see
 * `@/lib/server/membership-checkout-guard` for why that has to happen here
 * rather than being reconciled afterwards.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { CCW_ATTENDEE_OFFER_QUERY } from '@/lib/marketing/ccw-roadshow-offer-pack';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { learnerIsCcwAttendeeOfferEligible } from '@/lib/server/ccw-attendance/attendee-offer';
import { membershipCheckoutDecisionFor } from '@/lib/server/membership-checkout-guard';
import { resolveProAnnualPriceId } from '@/lib/server/subscription-price';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import {
  readAttributionJourneyId,
  tryRecordAttributedStage,
} from '@/lib/server/event-attribution';

const UNAVAILABLE = 'Membership purchasing is not yet available.';
const ATTENDEE_UNAVAILABLE =
  'The attendee membership special is not available yet. Please try again later.';

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to start your membership.' }, { status: 401 });
  }
  const attributionJourneyId = readAttributionJourneyId(request);

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
    attendeeOffer?: boolean;
    offer?: string;
  };

  const wantAttendeeOffer = body.attendeeOffer === true || body.offer === CCW_ATTENDEE_OFFER_QUERY;

  // Regular $795 path stays behind the subscriptions flag; attendee $295 does not.
  if (!wantAttendeeOffer && !subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const origin = request.nextUrl.origin;
  const success_url =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : `${origin}/dashboard/courses?membership=active`;
  const cancel_url =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : `${origin}/subscribe?checkout=cancelled`;

  // AC-9: at most one live membership per learner, on BOTH paths. `userId` is
  // unique on LmsSubscription, so a second Stripe subscription collapses onto
  // one row while Stripe bills both — see membership-checkout-guard. Fails
  // closed: an unverifiable membership state opens no checkout.
  const guard = await membershipCheckoutDecisionFor(claims.sub);
  if (!guard.allowed) {
    return guard.block === 'already_subscribed'
      ? NextResponse.json(
          {
            detail:
              'You already have an active CARSI membership. Manage it from your dashboard.',
          },
          { status: 409 }
        )
      : NextResponse.json(
          { detail: 'We could not confirm your membership status. Please try again shortly.' },
          { status: 503 }
        );
  }

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
          { status: 403 }
        );
      }

      // The standing annual price plus a first-year-only coupon. Both must
      // resolve: without the coupon this would charge the attendee full price
      // while the CTA promises A$295, so it fails closed rather than selling the
      // wrong thing (spec §10.4 AC-6).
      const attendeePriceId = await resolveProAnnualPriceId();
      const couponId = process.env.CCW_MEMBERSHIP_COUPON_ID?.trim();
      if (!attendeePriceId || !couponId) {
        return NextResponse.json({ detail: ATTENDEE_UNAVAILABLE }, { status: 503 });
      }

      const session = await getStripeClient().checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: attendeePriceId, quantity: 1 }],
        // AC-10: the discount is applied server-side and is never reachable as a
        // public promotion code. `allow_promotion_codes` is OMITTED rather than
        // set false — Stripe rejects a session carrying both it and `discounts`,
        // and its default is already "no promotion codes".
        discounts: [{ coupon: couponId }],
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
      });

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
        ...(attributionJourneyId ? { attribution_journey_id: attributionJourneyId } : {}),
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          carsi_user_id: claims.sub,
          plan: 'pro_annual',
          ...(attributionJourneyId ? { attribution_journey_id: attributionJourneyId } : {}),
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    await tryRecordAttributedStage(attributionJourneyId, 'checkout_started', {
      transactionId: session.id,
    });
    return NextResponse.json({ url: session.url, checkout_url: session.url });
  } catch (error) {
    console.error('[subscription/checkout] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
