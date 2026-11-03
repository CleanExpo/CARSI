import { NextRequest, NextResponse } from 'next/server';

import { CoachingPriceChangedError } from '@/lib/coaching-portal/coaches';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { createCarsiCoachingMonthlyCheckoutSession } from '@/lib/server/carsi-coaching-monthly-checkout';
import { isCarsiCoachingMonthlyEnabled } from '@/lib/server/carsi-coaching-monthly-flag';

const UNAVAILABLE =
  'Business Coaching checkout is not available yet. Email support@carsi.com.au and we will get you started.';

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to start Business Coaching.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  if (!isCarsiCoachingMonthlyEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
    expected_amount_cents?: unknown;
    expected_currency?: unknown;
  };

  // The price the member was shown. Checkout never bills an amount they did not see.
  if (
    typeof body.expected_amount_cents !== 'number' ||
    !Number.isInteger(body.expected_amount_cents) ||
    typeof body.expected_currency !== 'string' ||
    !body.expected_currency.trim()
  ) {
    return NextResponse.json(
      { detail: 'Refresh the page to load your price, then try again.' },
      { status: 400 }
    );
  }
  const expectedCharge = {
    amountCents: body.expected_amount_cents,
    currency: body.expected_currency.trim().toLowerCase(),
  };

  const origin = request.nextUrl.origin;
  const success_url =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : `${origin}${carsiCoachingMonthlyPath}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : `${origin}${carsiCoachingMonthlyPath}?checkout=cancelled`;

  try {
    const session = await createCarsiCoachingMonthlyCheckoutSession({
      userId: claims.sub,
      contactEmail: claims.email ?? '',
      contactName: claims.full_name,
      appOrigin: origin,
      successUrl: success_url,
      cancelUrl: cancel_url,
      expectedCharge,
    });
    return NextResponse.json({ checkout_url: session.checkout_url, url: session.checkout_url });
  } catch (error) {
    if (error instanceof CoachingPriceChangedError) {
      return NextResponse.json(
        { detail: 'Your coaching price has changed. Refresh the page to see it before paying.' },
        { status: 409 }
      );
    }
    console.error('[coaching/monthly/checkout]', error);
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }
}
