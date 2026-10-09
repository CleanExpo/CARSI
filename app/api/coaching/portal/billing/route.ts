import { NextRequest, NextResponse } from 'next/server';

import { createPortalSession } from '@/lib/api/stripe';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import { getAppOrigin, getCheckoutReturnUrl } from '@/lib/server/app-url';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to manage billing.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ detail: 'Payments not configured.' }, { status: 503 });
  }

  const row = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    row ? { status: row.status, currentPeriodEnd: row.currentPeriodEnd } : null
  );
  if (!entitlement.entitled) {
    return NextResponse.json(
      { detail: 'No active coaching subscription to manage.' },
      { status: 403 }
    );
  }

  const stripeCustomerId = row?.stripeCustomerId?.trim();
  if (!stripeCustomerId) {
    return NextResponse.json(
      { detail: 'Billing is not linked yet. Email support@carsi.com.au.' },
      { status: 404 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { return_url?: string };
  const origin = getAppOrigin(request);
  const return_url = getCheckoutReturnUrl(
    body.return_url,
    `${origin}${carsiCoachingPortalPath}/billing`
  );

  try {
    const session = await createPortalSession({
      customer: stripeCustomerId,
      return_url,
    });
    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to open billing portal.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[coaching/portal/billing]', error);
    return NextResponse.json({ detail: 'Failed to open billing portal.' }, { status: 500 });
  }
}
