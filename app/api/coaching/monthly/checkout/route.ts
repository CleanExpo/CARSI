import { NextRequest, NextResponse } from 'next/server';

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
    });
    return NextResponse.json({ checkout_url: session.checkout_url, url: session.checkout_url });
  } catch (error) {
    console.error('[coaching/monthly/checkout]', error);
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }
}
