/**
 * Pure (no-DB) helpers for the Teams seat subscription store, split out so they
 * can be imported and tested WITHOUT triggering the Prisma-backed module (which
 * tests mock). `team-subscription-store.ts` re-exports these.
 */

import type Stripe from 'stripe';

import { teamTierById, type TeamTier } from '@/lib/lms/pricing-tiers';

type ItemLike = { id?: string; quantity?: number | null; price?: { id?: string } | string | null };

function itemPriceId(item: ItemLike): string {
  const p = item.price;
  if (typeof p === 'string') return p;
  return typeof p?.id === 'string' ? p.id : '';
}

function itemQuantity(item: ItemLike): number {
  const qty = item.quantity;
  return typeof qty === 'number' && Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
}

function metaString(subscription: Pick<Stripe.Subscription, 'metadata'>, key: string): string {
  const v = subscription.metadata?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** The items of a two-item Teams subscription (GP-773 seat billing), told apart by Price id. */
export interface TeamSubscriptionItems<T extends ItemLike = ItemLike> {
  /** The tier from metadata `plan`, or null when the plan is not a Teams tier. */
  tier: TeamTier | null;
  /** The flat tier base Price id stamped at checkout (metadata `base_price_id`). */
  basePriceId: string;
  /** The extra-seat Price id stamped at checkout or seat expansion (metadata `seat_price_id`). */
  seatPriceId: string;
  /** The item on the base Price, if present. */
  base: T | null;
  /** The item on the seat Price, if present. */
  seat: T | null;
}

/**
 * THE one owner of "which item is the base and which is the seat item" (GP-773). Items are
 * matched by the verified Price ids the checkout stamped into the subscription metadata, not by
 * amount, so a later reprice of either Price never strips a paying team's seats. Returns null
 * for a subscription made before seat billing (no `base_price_id` stamp).
 */
export function teamSubscriptionItems<T extends ItemLike>(
  subscription: Pick<Stripe.Subscription, 'metadata'> & { items?: { data?: T[] } | null },
): TeamSubscriptionItems<T> | null {
  const basePriceId = metaString(subscription, 'base_price_id');
  if (!basePriceId) return null;
  const seatPriceId = metaString(subscription, 'seat_price_id');
  const items = subscription.items?.data ?? [];
  const plan = metaString(subscription, 'plan').toLowerCase();
  return {
    tier: teamTierById(plan) ?? null,
    basePriceId,
    seatPriceId,
    base: items.find((i) => itemPriceId(i) === basePriceId) ?? null,
    seat: seatPriceId ? (items.find((i) => itemPriceId(i) === seatPriceId) ?? null) : null,
  };
}

/**
 * Read the paid seat count of a Teams subscription.
 *
 * Seat billing (GP-773): the tier's included seats when the base item is present (quantity at
 * least 1), plus the quantity of the extra-seat item. An item on any other Price grants nothing,
 * and an unknown plan grants 0 (fail closed: no seats rather than a guessed grant). The webhook's
 * snapshot and terminal handlers both read this.
 *
 * A subscription without the seat-billing stamp (the earlier single-item model, never sold:
 * Teams has stayed behind TEAMS_SUBSCRIPTIONS_ENABLED) keeps the old reading: the first item's
 * quantity, then metadata `seat_count`, then 0.
 */
export function readSubscriptionSeatQuantity(subscription: Stripe.Subscription): number {
  const twoItem = teamSubscriptionItems(subscription as unknown as Parameters<typeof teamSubscriptionItems>[0]);
  if (twoItem) {
    if (!twoItem.tier) return 0;
    const included = twoItem.base && itemQuantity(twoItem.base) >= 1 ? twoItem.tier.seatsIncluded : 0;
    const extra = twoItem.seat ? itemQuantity(twoItem.seat) : 0;
    return included + extra;
  }

  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const qty = itemQuantity(item as unknown as ItemLike);
    if (qty > 0) return qty;
  }
  const metaSeats = subscription.metadata?.seat_count;
  if (typeof metaSeats === 'string') {
    const n = Number.parseInt(metaSeats, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
