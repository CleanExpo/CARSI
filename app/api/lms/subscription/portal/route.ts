/**
 * POST /api/lms/subscription/portal — open the Stripe Customer Portal so an
 * individual member can manage their annual membership (update card, view
 * invoices, cancel). Replaces the `{ url: '' }` stub in
 * app/api/lms/[[...path]]/route.ts (this dedicated route shadows the catch-all).
 *
 * Ships DARK behind SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain
 * step, mirroring subscription/checkout:
 *  - flag off                       → 503 "membership management not yet available"
 *  - not signed in                  → 401
 *  - Stripe not configured          → 503
 *  - no Stripe customer on file     → 404 (no subscription started yet)
 *
 * The Stripe customer id is read from the user's LmsSubscription row (written by
 * the subscription webhook). No customer id → the user has never checked out, so
 * there is nothing to manage.
 */

import { NextRequest, NextResponse } from 'next/server';

import { createPortalSession } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Membership management is not yet available.';

export async function POST(request: NextRequest) {
  // Ship dark: when the feature is off, behave exactly like the coming-soon interim.
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(
      { detail: 'Sign in to manage your membership.' },
      { status: 401 },
    );
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 },
    );
  }

  // Look up the user's Stripe customer id from their individual membership row.
  let stripeCustomerId: string | null = null;
  try {
    const { prisma } = await import('@/lib/prisma');
    const sub = await prisma.lmsSubscription.findUnique({
      where: { userId: claims.sub },
      select: { stripeCustomerId: true },
    });
    stripeCustomerId = sub?.stripeCustomerId ?? null;
  } catch (error) {
    console.error('[subscription/portal] subscription lookup failed:', error);
    return NextResponse.json(
      { detail: 'Failed to open the billing portal.' },
      { status: 500 },
    );
  }

  if (!stripeCustomerId) {
    // No customer on file → the user has never started a membership, so there is
    // nothing to manage. Honest 404 rather than a broken portal link.
    return NextResponse.json(
      { detail: 'No membership found to manage.' },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    return_url?: string;
  };

  const origin = request.nextUrl.origin;
  const return_url =
    typeof body.return_url === 'string' && body.return_url.startsWith('http')
      ? body.return_url
      : `${origin}/dashboard/courses`;

  try {
    const session = await createPortalSession({
      customer: stripeCustomerId,
      return_url,
    });

    if (!session.url) {
      return NextResponse.json(
        { detail: 'Failed to open the billing portal.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[subscription/portal] Stripe error:', error);
    return NextResponse.json(
      { detail: 'Failed to open the billing portal.' },
      { status: 500 },
    );
  }
}
