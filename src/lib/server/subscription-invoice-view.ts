import { getStripeClient } from '@/lib/api/stripe';
import { prisma } from '@/lib/prisma';
import {
  StaleSubscriptionInvoiceView,
  subscriptionAccessNeedsLatestInvoice,
  type SubscriptionInvoiceView,
} from '@/lib/server/payment-integrity-ledger';

/**
 * GP-641: Stripe's answer for a subscription's latest invoice, read BEFORE a transaction opens, so
 * no row lock is held across a network call. Inside the transaction `subscriptionAccessBlock`
 * matches it against the ledger by invoice id; if the ledger has since recorded an invoice newer
 * than that answer, it throws `StaleSubscriptionInvoiceView`, the transaction rolls back, and
 * Stripe is read again. After `MAX_VIEW_READS` reads that never settle, access stays blocked.
 */
const MAX_VIEW_READS = 3;

/** Read Stripe's latest invoice for the subscription, when the rows call for it (or `force`). */
export async function readSubscriptionInvoiceView(
  stripeSubscriptionId: string,
  options: { force?: boolean } = {},
): Promise<SubscriptionInvoiceView> {
  if (!options.force && !(await subscriptionAccessNeedsLatestInvoice(prisma, stripeSubscriptionId))) return {};
  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['latest_invoice'],
    });
    let invoice: unknown = (subscription as unknown as { latest_invoice?: unknown }).latest_invoice;
    if (typeof invoice === 'string') invoice = await stripe.invoices.retrieve(invoice);
    if (!invoice || typeof invoice !== 'object') return { latest: null };
    const { id, created, status, amount_paid } = invoice as {
      id?: unknown;
      created?: unknown;
      status?: unknown;
      amount_paid?: unknown;
    };
    if (typeof id !== 'string' || typeof created !== 'number' || !Number.isFinite(created)) {
      return { latest: 'unavailable' };
    }
    return {
      latest: {
        id,
        createdAt: new Date(created * 1000),
        paidWithMoney: status === 'paid' && typeof amount_paid === 'number' && amount_paid > 0,
      },
    };
  } catch (error) {
    console.error(`[subscription access] latest invoice read failed for subscription=${stripeSubscriptionId}; access stays blocked`, error);
    return { latest: 'unavailable' };
  }
}

/**
 * Run `run` (which opens the transaction) with a Stripe view read before it, reading again when
 * the transaction finds the view out of date. Never settling leaves access blocked, logged.
 */
export async function runWithSubscriptionInvoiceView<T>(
  stripeSubscriptionId: string,
  options: { force?: boolean },
  run: (view: SubscriptionInvoiceView) => Promise<T>,
): Promise<T> {
  for (let read = 1; read <= MAX_VIEW_READS; read += 1) {
    const view = await readSubscriptionInvoiceView(stripeSubscriptionId, { force: options.force || read > 1 });
    try {
      return await run(view);
    } catch (error) {
      if (!(error instanceof StaleSubscriptionInvoiceView)) throw error;
    }
  }
  console.error(
    `[subscription access] Stripe's latest invoice for subscription=${stripeSubscriptionId} never matched the ledger after ${MAX_VIEW_READS} reads; access stays blocked`,
  );
  return run({ settleClosed: true });
}
