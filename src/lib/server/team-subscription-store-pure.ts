/**
 * Pure (no-DB) helpers for the Teams seat subscription store, split out so they
 * can be imported and tested WITHOUT triggering the Prisma-backed module (which
 * tests mock). `team-subscription-store.ts` re-exports these.
 */

import type Stripe from 'stripe';

import { BUSINESS_OWNER_PLAN, EXTRA_STAFF_SEAT, type MembershipPrice } from '@/lib/lms/membership-prices';
import { teamTierById, type TeamTier } from '@/lib/lms/pricing-tiers';
import { stripePriceMatches, type StripePriceLike } from '@/lib/server/membership-price-check';

type ItemLike = {
  id?: string;
  quantity?: number | null;
  price?: StripePriceLike | string | null;
};

function itemQuantity(item: ItemLike): number {
  const qty = item.quantity;
  return typeof qty === 'number' && Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
}

/** Why a subscription is not the Teams shape. Every one of these means: no change, no grant. */
export type TeamShapeRefusal =
  | 'unknown_plan'
  | 'items_incomplete'
  | 'unknown_item'
  | 'no_base_item'
  | 'extra_base_item'
  | 'base_quantity_not_one'
  | 'extra_seat_item';

export type TeamSubscriptionShape<T extends ItemLike = ItemLike> =
  | {
      ok: true;
      tier: TeamTier;
      /** The owner plan item (A$1,295 yearly, quantity 1). */
      base: T;
      /** The extra-seat item (A$695 yearly), or null when no extra seat was bought. */
      seat: T | null;
      extraSeats: number;
      /** Included seats + extra seats: what the team has paid for. */
      seatLimit: number;
    }
  | { ok: false; reason: TeamShapeRefusal };

/** A Price id the caller has just resolved and verified, which a matched item must also carry. */
export interface ExpectedTeamPrices {
  basePriceId?: string | null;
  seatPriceId?: string | null;
}

/**
 * THE one rule for what a Teams subscription holds (GP-773, design fix for review kinds C and E).
 * Checkout builds its line items with `teamCheckoutLineItems` (the shape this rule accepts), seat
 * expansion classifies before it changes anything, and the webhook's seat count reads it. Nothing
 * else decides which item is which.
 *
 * A Teams subscription holds EXACTLY the owner plan item (its Price matches BUSINESS_OWNER_PLAN,
 * quantity 1) and AT MOST ONE extra-seat item (its Price matches EXTRA_STAFF_SEAT). Items are
 * identified by their own Price, checked by `stripePriceMatches`, never by metadata: metadata can
 * drift from what Stripe bills, and an item the code fails to recognise would otherwise be treated
 * as absent and billed twice. Anything else (an unknown item, a second seat or owner item, an
 * owner item at another quantity, a Price given only as an id, a partial item list, a plan that is
 * not a Teams tier) is refused: routes answer 409 and change nothing, the webhook grants no seats.
 *
 * `expected` narrows a match to a Price id the caller has just verified; seat expansion passes the
 * verified seat Price so a lookalike A$695 Price is refused, not topped up. An archived Price still
 * matches here because Stripe keeps billing it.
 */
export function classifyTeamSubscription<T extends ItemLike>(
  subscription: Pick<Stripe.Subscription, 'metadata'> & {
    items?: { data?: T[] | null; has_more?: boolean | null } | null;
  },
  expected: ExpectedTeamPrices = {},
): TeamSubscriptionShape<T> {
  const rawPlan = subscription.metadata?.plan;
  const plan = typeof rawPlan === 'string' ? rawPlan.trim().toLowerCase() : '';
  const tier = teamTierById(plan);
  if (!tier) return { ok: false, reason: 'unknown_plan' };

  const list = subscription.items;
  if (!list || !Array.isArray(list.data) || list.has_more === true) {
    return { ok: false, reason: 'items_incomplete' };
  }

  const matches = (item: T, spec: MembershipPrice, id: string | null | undefined): boolean => {
    const p = item.price;
    if (!p || typeof p !== 'object') return false;
    if (id && p.id !== id) return false;
    return stripePriceMatches(p, spec, { allowArchived: true });
  };

  const bases: T[] = [];
  const seats: T[] = [];
  for (const item of list.data) {
    if (matches(item, BUSINESS_OWNER_PLAN, expected.basePriceId)) bases.push(item);
    else if (matches(item, EXTRA_STAFF_SEAT, expected.seatPriceId)) seats.push(item);
    else return { ok: false, reason: 'unknown_item' };
  }

  if (bases.length === 0) return { ok: false, reason: 'no_base_item' };
  if (bases.length > 1) return { ok: false, reason: 'extra_base_item' };
  if (bases[0].quantity !== 1) return { ok: false, reason: 'base_quantity_not_one' };
  if (seats.length > 1) return { ok: false, reason: 'extra_seat_item' };

  const seat = seats[0] ?? null;
  const extraSeats = seat ? itemQuantity(seat) : 0;
  return { ok: true, tier, base: bases[0], seat, extraSeats, seatLimit: tier.seatsIncluded + extraSeats };
}

/**
 * The line items a Teams checkout sends: the owner plan at quantity 1, plus the seat item only
 * when extra seats are bought (Stripe Checkout is never sent a zero quantity). This is the shape
 * `classifyTeamSubscription` accepts; `team-subscription-items.test.ts` round-trips it.
 */
export function teamCheckoutLineItems(
  basePriceId: string,
  seatPriceId: string,
  extraSeats: number,
): Array<{ price: string; quantity: number }> {
  const lineItems = [{ price: basePriceId, quantity: 1 }];
  if (extraSeats > 0) lineItems.push({ price: seatPriceId, quantity: extraSeats });
  return lineItems;
}

/**
 * THE one owner of the seat-grant rule for a seat purchase (Phill 23/11/2026, "Charge first").
 *
 * Seat expansion updates the subscription with `proration_behavior: 'always_invoice'` and
 * `payment_behavior: 'error_if_incomplete'`, so Stripe invoices the added seats at once and
 * applies the item change only when that invoice is paid; a declined or incomplete payment
 * makes the update fail and leaves the subscription unchanged. Seats are granted only when the
 * invoice the update returns (`latest_invoice`, expanded) is `paid`. Anything else (open,
 * draft, unreadable, not expanded) grants nothing.
 *
 * The webhook needs no second copy of this rule: it counts seats from the subscription's items
 * (`readSubscriptionSeatQuantity`), and under these two settings the items only change once
 * the charge is paid.
 */
export function seatChargePaid(updated: {
  latest_invoice?: string | { status?: string | null } | null;
}): boolean {
  const invoice = updated.latest_invoice;
  return typeof invoice === 'object' && invoice !== null && invoice.status === 'paid';
}

/** The update parameters every seat purchase must carry so the charge comes first. */
export const SEAT_CHARGE_FIRST = {
  proration_behavior: 'always_invoice',
  payment_behavior: 'error_if_incomplete',
  expand: ['latest_invoice'],
} as const;

/**
 * Read the paid seat count of a Teams subscription for the webhook (snapshot and terminal
 * writes): `classifyTeamSubscription`'s seat limit, or 0 when the subscription is not the Teams
 * shape (fail closed: no seats rather than a guessed grant). The earlier fallbacks (first item's
 * quantity, metadata `seat_count`) are gone; Teams was never sold on that model.
 */
export function readSubscriptionSeatQuantity(subscription: Stripe.Subscription): number {
  const shape = classifyTeamSubscription(
    subscription as unknown as Parameters<typeof classifyTeamSubscription>[0],
  );
  if (shape.ok) return shape.seatLimit;
  console.error('[team-subscription] not the Teams owner plan + seat shape; no seats granted', {
    subscriptionId: subscription.id,
    reason: shape.reason,
  });
  return 0;
}
