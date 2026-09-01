/**
 * POST /api/lms/subscription/checkout — start the individual annual membership
 * (`pro_annual`, A$795/yr) Stripe Checkout in `mode: 'subscription'`.
 *
 * There is ONE membership price. The CCW roadshow attendee special — A$295 for
 * the first year via a `duration: once` Stripe coupon — was removed by the
 * founder on 2026-08-25 before it ever went live: the coupon it depended on was
 * never created in Stripe, so the path had only ever returned 503. Do not
 * reintroduce a discounted recurring price if the special is ever revived; that
 * would renew at the reduced rate forever and quietly commit CARSI to A$500/yr
 * less from every attendee who claimed it. The admin comp path
 * (`POST /api/admin/ccw-roadshow/comp-membership`) is a DIFFERENT instrument and
 * is unaffected — it grants a year outright with no Stripe subscription.
 *
 * Ships dark behind SUBSCRIPTIONS_ENABLED.
 *
 * Guarded against opening a second checkout for a learner who already holds a
 * live membership (spec §10.4 AC-9) — see `@/lib/server/membership-checkout-guard`
 * for why that has to happen here rather than being reconciled afterwards — and
 * then takes an atomic per-learner reservation, so two requests arriving together
 * cannot each open a session (`@/lib/server/membership-checkout-reservation`).
 */
import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { membershipCheckoutDecisionFor } from '@/lib/server/membership-checkout-guard';
import {
  checkoutSessionExpiresAt,
  releaseMembershipCheckout,
  reserveMembershipCheckout,
} from '@/lib/server/membership-checkout-reservation';
import { resolveProAnnualPriceId } from '@/lib/server/subscription-price';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import {
  readAttributionJourneyId,
  tryRecordAttributedStage,
} from '@/lib/server/event-attribution';

const UNAVAILABLE = 'Membership purchasing is not yet available.';

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
  };

  if (!subscriptionsEnabled()) {
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

  // Atomic claim on this learner's checkout. The guard above answers "does a
  // membership already exist"; this answers "is another checkout already open",
  // which a read cannot decide because both racers read the same absence.
  // Taken AFTER validation so a rejected request never holds a reservation.
  const reservation = await reserveMembershipCheckout(claims.sub);
  if (reservation !== 'reserved') {
    return reservation === 'busy'
      ? NextResponse.json(
          {
            detail:
              'A membership checkout is already open for your account. Finish it, or try again in a few minutes.',
          },
          { status: 409 }
        )
      : NextResponse.json(
          { detail: 'We could not start checkout just now. Please try again shortly.' },
          { status: 503 }
        );
  }

  try {
    const priceId = await resolveProAnnualPriceId();
    if (!priceId) {
      await releaseMembershipCheckout(claims.sub);
      return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
    }

    const session = await getStripeClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Paired with the reservation TTL — see membership-checkout-reservation.
      expires_at: checkoutSessionExpiresAt(),
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
      await releaseMembershipCheckout(claims.sub);
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    await tryRecordAttributedStage(attributionJourneyId, 'checkout_started', {
      transactionId: session.id,
    });
    return NextResponse.json({ url: session.url, checkout_url: session.url });
  } catch (error) {
    // Stripe never opened a session, so hand the reservation back rather than
    // making the learner wait out the TTL for a failure that was ours.
    await releaseMembershipCheckout(claims.sub);
    console.error('[subscription/checkout] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
