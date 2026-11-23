/**
 * POST /api/lms/subscription/teams/expand-seats — buy additional seats on an
 * active Teams seat subscription (WS1-E2, GP-442; seat billing GP-773).
 *
 * Body: { additional_seats: number }  (1..50)
 *
 * Seat billing (see the checkout route): the subscription has a flat tier base item (quantity
 * 1, includes the tier's seats) and a separate A$695 yearly extra-seat item. Expansion raises
 * the seat item's quantity, or adds the seat item at the verified seat Price when there is
 * none. The base item is never changed.
 *
 * Charge first (Phill 23/11/2026): the update uses `always_invoice` + `error_if_incomplete`,
 * so Stripe invoices the prorated seats immediately and applies the change only when that
 * invoice is paid. Seats are granted only after `seatChargePaid` confirms it; a declined or
 * incomplete payment returns 402 and leaves seats unchanged. The webhook
 * (customer.subscription.updated) then refreshes `seatLimit` from the paid items.
 *
 * Owner-only. FAILS CLOSED: flag off / not signed in / not the owner / no active
 * subscription → no expansion, no charge. Seat Price missing or mismatched → 503; a
 * subscription not on the seat-billing model, not charged automatically, or with a seat item
 * on another Price → 409; payment declined, incomplete or unconfirmed → 402.
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
import {
  SEAT_CHARGE_FIRST,
  seatChargePaid,
  teamSubscriptionItems,
} from '@/lib/server/team-subscription-store-pure';
import { getTeamForUser } from '@/lib/server/teams';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const MAX_ADDITIONAL = 50;

/**
 * Stripe refused to take the payment for the added seats: a card error, or HTTP 402 (what
 * `error_if_incomplete` returns when the invoice cannot be paid, including when it needs the
 * buyer's action). In every such case Stripe left the subscription unchanged.
 */
function isSeatPaymentRefused(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { type?: unknown; statusCode?: unknown };
  return e.type === 'StripeCardError' || e.statusCode === 402;
}

function paymentRefused() {
  return NextResponse.json(
    {
      detail:
        'Your payment for the extra seats did not go through, so no seats were added. Check your card details and try again.',
      reason: 'seat_payment_failed',
    },
    { status: 402 },
  );
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

    // Charge first: only an automatically charged subscription can be made to pay for the seats
    // before they are added. An invoiced (send_invoice) subscription would add them unpaid.
    if (stripeSub.collection_method !== 'charge_automatically') return refuse();

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
        ...SEAT_CHARGE_FIRST,
        expand: [...SEAT_CHARGE_FIRST.expand],
      };
    } else {
      // No seat item yet (the team bought no extra seats at checkout): add it at the verified
      // seat Price and stamp its id so the webhook counts it.
      newExtraSeats = additional;
      update = {
        items: [{ price: seatPriceId, quantity: newExtraSeats }],
        metadata: { seat_price_id: seatPriceId },
        ...SEAT_CHARGE_FIRST,
        expand: [...SEAT_CHARGE_FIRST.expand],
      };
    }

    // The base item is never in the update: only the seat item changes. Stripe invoices the
    // added seats now and applies the change only if that invoice is paid.
    let updated: Stripe.Subscription;
    try {
      updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, update);
    } catch (error) {
      if (isSeatPaymentRefused(error)) {
        // Declined, or needs the buyer's action: Stripe applied nothing, so neither do we.
        return paymentRefused();
      }
      throw error;
    }

    if (!seatChargePaid(updated as unknown as Parameters<typeof seatChargePaid>[0])) {
      // Not confirmed paid: grant nothing. Should not happen under error_if_incomplete; logged
      // so an operator can reconcile the subscription by hand.
      console.error('[subscription/teams/expand-seats] seat invoice not paid after update', {
        subscriptionId: sub.stripeSubscriptionId,
      });
      return paymentRefused();
    }

    // Paid: reflect the new seat limit (included seats + extra seats); the
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
