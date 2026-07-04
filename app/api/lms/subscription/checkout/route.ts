/**
 * POST /api/lms/subscription/checkout — start the individual annual membership
 * (`pro_annual`, A$795/yr) Stripe Checkout in `mode: 'subscription'`.
 *
 * Separate from the one-off course checkout (`/api/lms/checkout`, `mode:
 * 'payment'`) so the two flows never entangle. Ships DARK behind
 * SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain step:
 *  - flag off                      → 503 "membership purchasing not yet available"
 *  - not signed in                 → 401
 *  - Stripe not configured         → 503
 *  - annual Price unresolvable     → 503 "membership purchasing not yet available"
 *
 * The annual Price is resolved from STRIPE_PRICE_PRO_ANNUAL or by lookup_key
 * 'carsi_pro_annual'. It does not exist until Rana creates it per
 * docs/runbooks/rana-stripe-connection.md.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { resolveProAnnualPriceId } from '@/lib/server/subscription-price';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Membership purchasing is not yet available.';

export async function POST(request: NextRequest) {
  // Ship dark: when the feature is off, behave exactly like the coming-soon interim.
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(
      { detail: 'Sign in to start your membership.' },
      { status: 401 },
    );
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 },
    );
  }

  const priceId = await resolveProAnnualPriceId();
  if (!priceId) {
    // Fail closed: no Price → honest unavailable, never a wrong Price.
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
  };

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
    const session = await getStripeClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: claims.email,
      success_url,
      cancel_url,
      // carsi_user_id lets the webhook map the subscription back to this learner
      // even before the customer email is confirmed. Copied onto the created
      // subscription via subscription_data.metadata.
      metadata: {
        carsi_user_id: claims.sub,
        plan: 'pro_annual',
        source: 'carsi-pro-annual',
      },
      subscription_data: {
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
