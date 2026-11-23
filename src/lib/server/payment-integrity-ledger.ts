import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/server/db-tx';

/**
 * GP-759: two durable payment facts, kept in `stripe_webhook_events` (the Stripe idempotency
 * ledger) under namespaced keys, as GP-672 does for coaching email deliveries. Stripe event
 * ids start with `evt_`, so these keys cannot collide with event claims, and nothing prunes
 * the table. No schema change.
 *
 * 1. Reversal markers — `payment-reversed:<checkout session id>`. Written when a full refund or
 *    a chargeback reverses a one-off checkout payment. Enrolment refuses to issue or reactivate
 *    access from a reversed session, even when the refund landed before any enrolment row
 *    existed. A refund is terminal; a dispute marker is removed only when the dispute is won.
 *    GP-641: subscription payments have their own writers under the subscription id (see the
 *    "Subscriptions" section below).
 *
 * 2. Unfulfilled payments — `unfulfilled-payment:<checkout session or subscription id>`. Written
 *    when a paid CARSI event could not be fulfilled, so the payment is never dropped silently.
 *    `type` carries the reason; `processedAt` set means a later delivery or the success page
 *    fulfilled it (resolved). Admins see the unresolved list.
 */

/** Thrown by the enrolment writer when a checkout session's payment was reversed. */
export const PAYMENT_REVERSED = 'PAYMENT_REVERSED';

/** What the success-page routes tell a buyer whose payment was refunded or charged back. */
export const PAYMENT_REVERSED_BODY = {
  detail:
    'This payment was refunded or disputed, so it no longer gives access to the course. Contact support@carsi.com.au if you think this is wrong.',
  code: PAYMENT_REVERSED,
} as const;

const REVERSAL_PREFIX = 'payment-reversed:';
const UNFULFILLED_PREFIX = 'unfulfilled-payment:';
const UNFULFILLED_TYPE_PREFIX = 'unfulfilled:';

export type PaymentReversalReason = 'refunded' | 'disputed';

export type UnfulfilledPaymentReason =
  | 'learner_unmatched'
  | 'already_on_team'
  | 'fulfilment_failed'
  | 'team_unresolved'
  | 'org_not_provisioned'
  | 'subscriber_unresolved';

function reversalId(checkoutSessionId: string): string {
  return `${REVERSAL_PREFIX}${checkoutSessionId.trim()}`;
}

function unfulfilledId(stripeObjectId: string): string {
  return `${UNFULFILLED_PREFIX}${stripeObjectId.trim()}`;
}

const REVERSED_TYPE_PREFIX = 'payment_reversed:';
/** A won dispute leaves this tombstone, so a delayed dispute-created event cannot relock. */
const DISPUTE_WON_TYPE = 'payment_reversal_lifted:dispute_won';

/**
 * Record that a checkout session's payment was reversed. `processedAt` holds the Stripe event
 * time. A refund always wins (it overwrites any dispute state). A dispute never downgrades a
 * refund marker, and is ignored when a dispute-won tombstone is at least as new (Stripe does not
 * deliver events in order).
 */
export async function recordCheckoutPaymentReversed(
  tx: Prisma.TransactionClient,
  checkoutSessionId: string,
  reason: PaymentReversalReason,
  eventAt: Date,
): Promise<void> {
  const id = reversalId(checkoutSessionId);
  const type = `${REVERSED_TYPE_PREFIX}${reason}`;
  if (reason === 'refunded') {
    // The refund marker and the unfulfilled record are settled together, in the caller's
    // serialisable transaction (the seat step), so the order Stripe delivers the refund and the
    // checkout in cannot matter (recordUnfulfilledPayment reads this marker serialisably too).
    await tx.stripeWebhookEvent.upsert({
      where: { id },
      create: { id, type, processedAt: eventAt },
      update: { type, processedAt: eventAt },
    });
    // A full refund means nothing is owed: no admin may grant it by hand.
    await tx.stripeWebhookEvent.updateMany({
      where: { id: unfulfilledId(checkoutSessionId), processedAt: null },
      data: { processedAt: new Date() },
    });
    return;
  }
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await tx.stripeWebhookEvent.create({ data: { id, type, processedAt: eventAt } });
    return;
  }
  if (existing.type === DISPUTE_WON_TYPE) {
    const wonAt = existing.processedAt;
    if (wonAt && wonAt.getTime() >= eventAt.getTime()) return; // stale dispute-created
    await tx.stripeWebhookEvent.updateMany({
      where: { id, type: DISPUTE_WON_TYPE },
      data: { type, processedAt: eventAt },
    });
  }
  // An existing refund or dispute marker stays as it is.
}

/**
 * A dispute closed in the merchant's favour lifts a dispute marker (never a refund marker) and
 * leaves a tombstone carrying the event time, which a delayed dispute-created event respects.
 */
export async function clearDisputedCheckoutReversal(
  tx: Prisma.TransactionClient,
  checkoutSessionId: string,
  eventAt: Date,
): Promise<void> {
  const id = reversalId(checkoutSessionId);
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await tx.stripeWebhookEvent.create({
      data: { id, type: DISPUTE_WON_TYPE, processedAt: eventAt },
    });
    return;
  }
  if (existing.type === `${REVERSED_TYPE_PREFIX}disputed` || existing.type === DISPUTE_WON_TYPE) {
    const markedAt = existing.processedAt;
    if (markedAt && markedAt.getTime() > eventAt.getTime()) return; // a newer dispute stands
    await tx.stripeWebhookEvent.updateMany({
      where: { id, type: existing.type },
      data: { type: DISPUTE_WON_TYPE, processedAt: eventAt },
    });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Subscriptions (GP-641)                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * A subscription's access is decided by three rows, keyed by the Stripe subscription id (`sub_*`,
 * which cannot collide with a checkout session id). Only the seat step writes them.
 *
 *  - `payment-reversed:<sub>`: the newest refunded or charged-back invoice. `processedAt` is that
 *    INVOICE's creation time (Stripe's `invoice.created`), not the event time, so it orders the
 *    invoices themselves, whatever order Stripe delivers the events in.
 *  - `subscription-paid:<sub>`: the creation time of the newest invoice paid with money.
 *  - `subscription-ended:<sub>`: Stripe deleted the subscription. Terminal.
 *
 * Access is blocked when the subscription was deleted, or when the newest reversed invoice is at
 * least as new as the newest paid one (the member's latest payment was taken back). A refund or
 * chargeback of an older invoice, after a newer invoice was paid, takes nothing away. Both
 * ordering rows only move forward, so no delivery order can overwrite a newer fact.
 */
const SUBSCRIPTION_PAID_PREFIX = 'subscription-paid:';
const SUBSCRIPTION_PAID_TYPE = 'subscription_paid:invoice';
const ENDED_PREFIX = 'subscription-ended:';
const ENDED_TYPE = 'subscription_ended:deleted';

function paidId(stripeSubscriptionId: string): string {
  return `${SUBSCRIPTION_PAID_PREFIX}${stripeSubscriptionId.trim()}`;
}
function endedId(stripeSubscriptionId: string): string {
  return `${ENDED_PREFIX}${stripeSubscriptionId.trim()}`;
}

/** Why a subscription gives no access: its latest payment was reversed, or Stripe deleted it. */
export type SubscriptionAccessBlock = 'payment_reversed' | 'deleted';

/**
 * Record the refund or chargeback of the subscription invoice created at `invoiceCreatedAt`.
 * The newest invoice decides. For the same invoice a refund wins over a dispute and over a won
 * dispute; a dispute never replaces a refund or a won-dispute tombstone (a delayed
 * dispute-created event).
 */
export async function recordSubscriptionPaymentReversed(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  reason: PaymentReversalReason,
  invoiceCreatedAt: Date,
): Promise<void> {
  const id = reversalId(stripeSubscriptionId);
  const type = `${REVERSED_TYPE_PREFIX}${reason}`;
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await tx.stripeWebhookEvent.create({ data: { id, type, processedAt: invoiceCreatedAt } });
    return;
  }
  const markedAt = existing.processedAt?.getTime() ?? 0;
  const at = invoiceCreatedAt.getTime();
  if (at < markedAt) return; // an older invoice: the newer one decides
  if (at === markedAt && (reason !== 'refunded' || existing.type === type)) return;
  await tx.stripeWebhookEvent.updateMany({
    where: { id, type: existing.type },
    data: { type, processedAt: invoiceCreatedAt },
  });
}

/**
 * A dispute of the subscription invoice created at `invoiceCreatedAt` was won: a dispute marker
 * for that invoice becomes a tombstone. A refund stays; a newer invoice's marker stays.
 */
export async function clearSubscriptionDisputedReversal(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  invoiceCreatedAt: Date,
): Promise<void> {
  const id = reversalId(stripeSubscriptionId);
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await tx.stripeWebhookEvent.create({
      data: { id, type: DISPUTE_WON_TYPE, processedAt: invoiceCreatedAt },
    });
    return;
  }
  const markedAt = existing.processedAt?.getTime() ?? 0;
  const at = invoiceCreatedAt.getTime();
  if (at < markedAt) return;
  if (at === markedAt && existing.type !== `${REVERSED_TYPE_PREFIX}disputed`) return;
  await tx.stripeWebhookEvent.updateMany({
    where: { id, type: existing.type },
    data: { type: DISPUTE_WON_TYPE, processedAt: invoiceCreatedAt },
  });
}

/** Record a subscription invoice paid with money. Keeps the newest invoice's creation time. */
export async function recordSubscriptionInvoicePaid(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  invoiceCreatedAt: Date,
): Promise<void> {
  const id = paidId(stripeSubscriptionId);
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await tx.stripeWebhookEvent.create({
      data: { id, type: SUBSCRIPTION_PAID_TYPE, processedAt: invoiceCreatedAt },
    });
    return;
  }
  if ((existing.processedAt?.getTime() ?? 0) >= invoiceCreatedAt.getTime()) return;
  await tx.stripeWebhookEvent.updateMany({
    where: { id },
    data: { processedAt: invoiceCreatedAt },
  });
}

/** Record that Stripe deleted this subscription. Terminal and idempotent. */
export async function recordSubscriptionEnded(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  eventAt: Date,
): Promise<void> {
  const id = endedId(stripeSubscriptionId);
  await tx.stripeWebhookEvent.upsert({
    where: { id },
    create: { id, type: ENDED_TYPE, processedAt: eventAt },
    update: {},
  });
}

/**
 * What blocks this subscription's access, or null. Callers deciding a write pass the write's own
 * transaction, so a reversal committing concurrently is either seen or serialised after it.
 */
export async function subscriptionAccessBlock(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
): Promise<SubscriptionAccessBlock | null> {
  if (!stripeSubscriptionId?.trim()) return null;
  const reversal = await tx.stripeWebhookEvent.findUnique({
    where: { id: reversalId(stripeSubscriptionId) },
  });
  if (reversal?.type.startsWith(REVERSED_TYPE_PREFIX)) {
    const paid = await tx.stripeWebhookEvent.findUnique({ where: { id: paidId(stripeSubscriptionId) } });
    const paidAt = paid?.processedAt?.getTime();
    const reversedAt = reversal.processedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (paidAt === undefined || paidAt <= reversedAt) return 'payment_reversed';
  }
  const ended = await tx.stripeWebhookEvent.findUnique({ where: { id: endedId(stripeSubscriptionId) } });
  return ended ? 'deleted' : null;
}

/** Close an open unfulfilled record for an object that is owed nothing, in the caller's step. */
export async function closeUnfulfilledPayment(
  tx: Prisma.TransactionClient,
  stripeObjectId: string,
): Promise<void> {
  await tx.stripeWebhookEvent.updateMany({
    where: { id: unfulfilledId(stripeObjectId), processedAt: null },
    data: { processedAt: new Date() },
  });
}

export async function isCheckoutPaymentReversed(
  db: Prisma.TransactionClient | typeof prisma,
  checkoutSessionId: string,
): Promise<boolean> {
  const row = await db.stripeWebhookEvent.findUnique({
    where: { id: reversalId(checkoutSessionId) },
  });
  return Boolean(row && row.type.startsWith(REVERSED_TYPE_PREFIX));
}

/**
 * Store (or re-open) the unfulfilled record for a paid Stripe object. Idempotent per object:
 * a retried delivery updates the reason and keeps the first-seen time.
 */
export async function recordUnfulfilledPayment(
  stripeObjectId: string,
  reason: UnfulfilledPaymentReason,
  options: { subscription?: boolean } = {},
): Promise<boolean> {
  const id = unfulfilledId(stripeObjectId);
  const type = `${UNFULFILLED_TYPE_PREFIX}${reason}`;
  console.error('[payment-integrity] paid Stripe object not fulfilled', {
    stripeObjectId,
    reason,
  });
  return runSerializable(async (tx) => {
    // A fully refunded checkout session is owed nothing: keep it off the open list whichever
    // order Stripe delivered the refund and the checkout in. A dispute stays listed (it may
    // yet be won).
    const marker = await tx.stripeWebhookEvent.findUnique({
      where: { id: reversalId(stripeObjectId) },
    });
    // GP-641: a subscription is owed nothing exactly when its access is blocked (latest payment
    // refunded or charged back, or deleted); a refund of an older invoice, after a newer one was
    // paid, leaves it owed. Read on this transaction, so a reversal racing it is serialised.
    const refunded = options.subscription
      ? (await subscriptionAccessBlock(tx, stripeObjectId)) !== null
      : marker?.type === `${REVERSED_TYPE_PREFIX}refunded`;
    await tx.stripeWebhookEvent.upsert({
      where: { id },
      create: { id, type, ...(refunded ? { processedAt: new Date() } : {}) },
      update: refunded ? { type } : { type, processedAt: null },
    });
    return !refunded;
  });
}

/** Mark the record resolved once the payment has been fulfilled. A no-op when none exists. */
export async function resolveUnfulfilledPayment(stripeObjectId: string): Promise<void> {
  await prisma.stripeWebhookEvent.updateMany({
    where: { id: unfulfilledId(stripeObjectId), processedAt: null },
    data: { processedAt: new Date() },
  });
}

/**
 * Success-path form of `resolveUnfulfilledPayment` for the success-page routes: the buyer
 * already has access, so a ledger fault is logged rather than failing their request.
 */
export async function markUnfulfilledPaymentResolved(
  stripeObjectId: string,
  logTag: string,
): Promise<void> {
  try {
    await resolveUnfulfilledPayment(stripeObjectId);
  } catch (error) {
    console.error(`${logTag} could not mark the unfulfilled payment record resolved`, error);
  }
}

export type UnfulfilledPaymentRow = {
  stripeObjectId: string;
  reason: string;
  firstSeenAt: string;
};

/** Unresolved unfulfilled payments, newest first. */
export async function listUnresolvedUnfulfilledPayments(
  limit = 200,
): Promise<UnfulfilledPaymentRow[]> {
  const rows = await prisma.stripeWebhookEvent.findMany({
    where: { id: { startsWith: UNFULFILLED_PREFIX }, processedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((row) => ({
    stripeObjectId: row.id.slice(UNFULFILLED_PREFIX.length),
    reason: row.type.startsWith(UNFULFILLED_TYPE_PREFIX)
      ? row.type.slice(UNFULFILLED_TYPE_PREFIX.length)
      : row.type,
    firstSeenAt: row.createdAt.toISOString(),
  }));
}
