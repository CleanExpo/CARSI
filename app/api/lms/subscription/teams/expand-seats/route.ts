/**
 * POST /api/lms/subscription/teams/expand-seats — buy additional seats on an
 * active Teams seat subscription (WS1-E2, GP-442) by increasing the Stripe
 * subscription `quantity` with proration.
 *
 * Body: { additional_seats: number (1..50), request_id: string (one per click, GP-759) }
 *
 * Seat-billing decision (see the checkout route + PR body): seats are the
 * subscription `quantity`. Expansion updates the single subscription item's
 * quantity and lets Stripe prorate the mid-cycle difference
 * (`proration_behavior: 'create_prorations'`). The webhook
 * (customer.subscription.updated) then refreshes `seatLimit` from the new
 * quantity — so entitlement follows billing, server-side and fail-closed.
 *
 * Owner-only. FAILS CLOSED: flag off / not signed in / not the owner / no active
 * subscription → no expansion, no charge.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/api/stripe';
import { SEAT_ADD_IN_PROGRESS, SEATS_ALREADY_ADDED } from '@/lib/lms/seat-expansion-request';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideTeamSeatSubscription } from '@/lib/server/entitlements';
import { EXTRA_STAFF_SEAT } from '@/lib/lms/membership-prices';
import { stripePriceMatches, type StripePriceLike } from '@/lib/server/membership-price-check';
import { getTeamForUser } from '@/lib/server/teams';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const MAX_ADDITIONAL = 50;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

/** Stripe is still executing an earlier request with the same idempotency key. */
function isStripeKeyInUse(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { code?: unknown }).code === 'idempotency_key_in_use';
}

function isStripeIdempotencyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { type?: unknown; rawType?: unknown };
  return e.type === 'StripeIdempotencyError' || e.rawType === 'idempotency_error';
}

export async function POST(request: NextRequest) {
  if (!teamSubscriptionsEnabled()) {
    return NextResponse.json({ detail: 'Teams membership is not yet available.' }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ detail: 'Payments not configured.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    additional_seats?: number;
    request_id?: unknown;
  };
  const additional = Number(body.additional_seats);
  if (!Number.isInteger(additional) || additional < 1 || additional > MAX_ADDITIONAL) {
    return NextResponse.json(
      { detail: `Choose between 1 and ${MAX_ADDITIONAL} additional seats.` },
      { status: 400 },
    );
  }
  // GP-759: one id per click, made by the page and resent unchanged on every retry (the API
  // client retries a 5xx). It becomes the Stripe idempotency key, so a retried request can
  // never add (and charge for) the seats twice, even after the seat count moved in between.
  const requestId = typeof body.request_id === 'string' ? body.request_id.trim() : '';
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    return NextResponse.json(
      { detail: 'Refresh the page and try adding seats again.' },
      { status: 400 },
    );
  }

  const team = await getTeamForUser(claims.sub);
  if (!team || team.ownerId !== claims.sub) {
    return NextResponse.json(
      { detail: 'Only the team owner can add seats.' },
      { status: 403 },
    );
  }

  const sub = await prisma.lmsTeamSubscription.findUnique({ where: { teamId: team.id } });
  if (!sub || !sub.stripeSubscriptionId) {
    return NextResponse.json(
      { detail: 'No active Teams subscription to expand.' },
      { status: 409 },
    );
  }

  // Only expand a live subscription (active/grace) — never resurrect a lapsed one
  // by adding seats. Fail closed on any non-live state.
  const decision = decideTeamSeatSubscription({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    seatLimit: sub.seatLimit,
  });
  if (!decision.subscriptionEntitled) {
    return NextResponse.json(
      { detail: 'Your Teams subscription is not active. Renew before adding seats.', reason: decision.reason },
      { status: 409 },
    );
  }

  const newQuantity = sub.seatLimit + additional;

  try {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const item = stripeSub.items?.data?.[0];
    if (!item) {
      return NextResponse.json({ detail: 'Subscription item not found.' }, { status: 500 });
    }

    // GP-773: an extra staff seat is A$695 per year (founder ruling). A seat is billed at the
    // subscription item's Price, so refuse, before any charge, unless that Price is exactly the
    // extra-seat price. A tier bundle Price ($299, $799 or $2,499) would bill the wrong amount.
    if (!stripePriceMatches(item.price as StripePriceLike, EXTRA_STAFF_SEAT)) {
      return NextResponse.json(
        {
          detail:
            'Extra seats cannot be added to this subscription online yet. Contact CARSI support to add staff.',
          reason: 'seat_price_mismatch',
        },
        { status: 409 },
      );
    }

    await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      {
        items: [{ id: item.id, quantity: newQuantity }],
        proration_behavior: 'create_prorations',
      },
      { idempotencyKey: `carsi-expand-seats:${sub.stripeSubscriptionId}:${requestId}` },
    );

    // Optimistically reflect the new seat limit; the customer.subscription.updated
    // webhook re-confirms it authoritatively from the paid quantity.
    await prisma.lmsTeamSubscription.update({
      where: { teamId: team.id },
      data: { seatLimit: newQuantity },
    });

    return NextResponse.json({ ok: true, seat_limit: newQuantity, added: additional });
  } catch (error) {
    if (isStripeKeyInUse(error)) {
      // The earlier attempt with this id is still running at Stripe: its outcome is unknown,
      // so the page keeps the id and the buyer's next try waits on the same purchase.
      return NextResponse.json(
        {
          detail: 'Your earlier request is still being processed. Wait a moment, then try again.',
          error_code: SEAT_ADD_IN_PROGRESS,
        },
        { status: 409 },
      );
    }
    if (isStripeIdempotencyError(error)) {
      // This purchase was already applied; the retry arrived after the seat count moved.
      return NextResponse.json(
        {
          detail: 'These seats were already added. Refresh the page to see them.',
          error_code: SEATS_ALREADY_ADDED,
        },
        { status: 409 },
      );
    }
    console.error('[subscription/teams/expand-seats] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to add seats.' }, { status: 500 });
  }
}
