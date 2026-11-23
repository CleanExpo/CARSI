/**
 * POST /api/lms/subscription/teams/expand-seats — buy additional seats on an
 * active Teams seat subscription (WS1-E2, GP-442; seat billing GP-773).
 *
 * Body: { additional_seats: number }  (1..50)
 *
 * Seat billing (see the checkout route): the subscription has a flat tier base item (quantity
 * 1, includes the tier's seats) and a separate A$695 yearly extra-seat item. Expansion raises
 * the seat item's quantity, or adds the seat item at the verified seat Price when there is
 * none, and lets Stripe prorate the mid-cycle difference (`create_prorations`). The base item
 * is never changed. The webhook (customer.subscription.updated) then refreshes `seatLimit`
 * from both items, so entitlement follows billing.
 *
 * Owner-only. FAILS CLOSED: flag off / not signed in / not the owner / no active
 * subscription → no expansion, no charge. Seat Price missing or mismatched → 503; a
 * subscription not on the seat-billing model, or a seat item on another Price → 409.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideTeamSeatSubscription } from '@/lib/server/entitlements';
import { EXTRA_STAFF_SEAT } from '@/lib/lms/membership-prices';
import { stripePriceMatches, type StripePriceLike } from '@/lib/server/membership-price-check';
import { resolveTeamSeatPriceId } from '@/lib/server/team-subscription-price';
import { teamSubscriptionItems } from '@/lib/server/team-subscription-store-pure';
import { getTeamForUser } from '@/lib/server/teams';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const MAX_ADDITIONAL = 50;

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

  const body = (await request.json().catch(() => ({}))) as { additional_seats?: number };
  const additional = Number(body.additional_seats);
  if (!Number.isInteger(additional) || additional < 1 || additional > MAX_ADDITIONAL) {
    return NextResponse.json(
      { detail: `Choose between 1 and ${MAX_ADDITIONAL} additional seats.` },
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

  // GP-773: an extra staff seat is A$695 per year. Resolve and verify the seat Price before any
  // Stripe change; a missing or mismatched Price fails closed (503, nothing charged).
  const seatPriceId = await resolveTeamSeatPriceId();
  if (!seatPriceId) {
    return NextResponse.json(
      { detail: 'Extra seats are not available to buy online just now. Please try again later.' },
      { status: 503 },
    );
  }

  const refuse = () =>
    NextResponse.json(
      {
        detail:
          'Extra seats cannot be added to this subscription online yet. Contact CARSI support to add staff.',
        reason: 'seat_price_mismatch',
      },
      { status: 409 },
    );

  try {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

    // The subscription must be on the seat-billing model: a recognised tier and its base item
    // (stamped at checkout). An older single-item subscription is refused, never re-priced.
    const items = teamSubscriptionItems(stripeSub);
    if (!items || !items.tier || !items.base) return refuse();

    let update: Stripe.SubscriptionUpdateParams;
    let newExtraSeats: number;
    if (items.seat) {
      // Only add seats to an item already on the verified A$695 seat Price.
      const seatPrice = items.seat.price as unknown as StripePriceLike;
      if (items.seat.price?.id !== seatPriceId || !stripePriceMatches(seatPrice, EXTRA_STAFF_SEAT)) {
        return refuse();
      }
      newExtraSeats = (items.seat.quantity ?? 0) + additional;
      update = {
        items: [{ id: items.seat.id, quantity: newExtraSeats }],
        proration_behavior: 'create_prorations',
      };
    } else {
      // No seat item yet (the team bought no extra seats at checkout): add it at the verified
      // seat Price and stamp its id so the webhook counts it.
      newExtraSeats = additional;
      update = {
        items: [{ price: seatPriceId, quantity: newExtraSeats }],
        metadata: { seat_price_id: seatPriceId },
        proration_behavior: 'create_prorations',
      };
    }

    // The base item is never in the update: only the seat item changes.
    await stripe.subscriptions.update(sub.stripeSubscriptionId, update);

    // Optimistically reflect the new seat limit (included seats + extra seats); the
    // customer.subscription.updated webhook re-confirms it from the paid items.
    const newSeatLimit = items.tier.seatsIncluded + newExtraSeats;
    await prisma.lmsTeamSubscription.update({
      where: { teamId: team.id },
      data: { seatLimit: newSeatLimit },
    });

    return NextResponse.json({ ok: true, seat_limit: newSeatLimit, added: additional });
  } catch (error) {
    console.error('[subscription/teams/expand-seats] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to add seats.' }, { status: 500 });
  }
}
