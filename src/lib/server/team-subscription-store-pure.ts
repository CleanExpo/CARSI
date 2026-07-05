/**
 * Pure (no-DB) helpers for the Teams seat subscription store, split out so they
 * can be imported and tested WITHOUT triggering the Prisma-backed module (which
 * tests mock). `team-subscription-store.ts` re-exports these.
 */

import type Stripe from 'stripe';

/**
 * Read the seat count (Stripe subscription `quantity`) from a subscription's
 * first item. Falls back to metadata `seat_count`, then to 0 (fail closed — no
 * seats entitled — rather than guessing a grant).
 */
export function readSubscriptionSeatQuantity(subscription: Stripe.Subscription): number {
  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const qty = (item as unknown as { quantity?: number }).quantity;
    if (typeof qty === 'number' && Number.isFinite(qty) && qty > 0) return Math.floor(qty);
  }
  const metaSeats = subscription.metadata?.seat_count;
  if (typeof metaSeats === 'string') {
    const n = Number.parseInt(metaSeats, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
