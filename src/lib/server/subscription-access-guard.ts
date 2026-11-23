import type { Prisma } from '@/generated/prisma/client';
import { runSerializable } from '@/lib/server/db-tx';
import { subscriptionAccessBlock, type SubscriptionAccessBlock } from '@/lib/server/payment-integrity-ledger';
import { runWithSubscriptionInvoiceView } from '@/lib/server/subscription-invoice-view';

/**
 * GP-641: the one rule every subscription row write obeys. Stripe delivers events in any order,
 * so a refund, chargeback or deletion can land before the "created" event that writes the
 * membership row, or before the checkout reservation is linked to the subscription. The reversal
 * step (`seat-state.ts`) records a marker keyed by the Stripe subscription id; every writer of an
 * individual, Teams, organisation or coaching subscription row runs here, reads that marker on
 * the same SERIALIZABLE transaction as its write, and writes the blocked status when it is set. A
 * reversal racing the write either commits first (the write sees the marker) or after it (and
 * cancels the row the write made). When the ledger alone cannot say whether the reversed invoice
 * is still the member's latest payment, Stripe's latest invoice is read before the transaction
 * opens and matched by invoice id inside it (`subscription-invoice-view.ts`).
 *
 * Rows are keyed by their owner (member or team), not by subscription. An ended subscription
 * never overwrites a row that is already linked to a different subscription: the owner has
 * moved on, and cancelling that row would lock out a paying member.
 *
 * `seat-state-owner.test.ts` fails if a store writes one of these rows outside this guard.
 */

/**
 * The status a blocked subscription is written with.
 *  - Latest payment refunded or charged back: `unpaid`. Every entitlement reads it as lapsed, with
 *    no paid-through window (coaching gives paid-through access to `canceled`; the payment was
 *    taken back, so nothing was paid through).
 *  - Deleted by Stripe: `canceled`, as Stripe writes it, so a deleted coaching subscription keeps
 *    the paid-through window it had before GP-641.
 */
export const REVERSED_SUBSCRIPTION_STATUS = 'unpaid';
export const DELETED_SUBSCRIPTION_STATUS = 'canceled';

export function blockedSubscriptionStatus(block: SubscriptionAccessBlock): string {
  return block === 'payment_reversed' ? REVERSED_SUBSCRIPTION_STATUS : DELETED_SUBSCRIPTION_STATUS;
}

export type SubscriptionRowLink<T> = {
  /** The subscription id the owner's row is linked to now (null or absent: none yet). */
  linkedSubscriptionId: (tx: Prisma.TransactionClient) => Promise<string | null | undefined>;
  /** What the write returns when it is skipped because the row belongs to another subscription. */
  skipped: T;
};

export function runGuardedSubscriptionWrite<T>(
  stripeSubscriptionId: string,
  status: string,
  row: SubscriptionRowLink<T>,
  write: (tx: Prisma.TransactionClient, status: string) => Promise<T>,
): Promise<T> {
  return runWithSubscriptionInvoiceView(stripeSubscriptionId, {}, (view) =>
    runSerializable(async (tx) => {
      const block = await subscriptionAccessBlock(tx, stripeSubscriptionId, view);
      if (!block) return write(tx, status);
      const linked = await row.linkedSubscriptionId(tx);
      if (linked && linked !== stripeSubscriptionId) return row.skipped;
      return write(tx, blockedSubscriptionStatus(block));
    }),
  );
}
