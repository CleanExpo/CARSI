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
  checkoutSessionId: string,
  reason: PaymentReversalReason,
  eventAt: Date,
): Promise<void> {
  const id = reversalId(checkoutSessionId);
  const type = `${REVERSED_TYPE_PREFIX}${reason}`;
  if (reason === 'refunded') {
    // The refund marker and the unfulfilled record are settled together, in one serialisable
    // transaction, so the order Stripe delivers the refund and the checkout in cannot matter
    // (recordUnfulfilledPayment reads this marker in its own serialisable transaction).
    await runSerializable(async (tx) => {
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
    });
    return;
  }
  const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await prisma.stripeWebhookEvent.create({ data: { id, type, processedAt: eventAt } });
    return;
  }
  if (existing.type === DISPUTE_WON_TYPE) {
    const wonAt = existing.processedAt;
    if (wonAt && wonAt.getTime() >= eventAt.getTime()) return; // stale dispute-created
    await prisma.stripeWebhookEvent.updateMany({
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
  checkoutSessionId: string,
  eventAt: Date,
): Promise<void> {
  const id = reversalId(checkoutSessionId);
  const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) {
    await prisma.stripeWebhookEvent.create({
      data: { id, type: DISPUTE_WON_TYPE, processedAt: eventAt },
    });
    return;
  }
  if (existing.type === `${REVERSED_TYPE_PREFIX}disputed` || existing.type === DISPUTE_WON_TYPE) {
    const markedAt = existing.processedAt;
    if (markedAt && markedAt.getTime() > eventAt.getTime()) return; // a newer dispute stands
    await prisma.stripeWebhookEvent.updateMany({
      where: { id, type: existing.type },
      data: { type: DISPUTE_WON_TYPE, processedAt: eventAt },
    });
  }
}

export async function isCheckoutPaymentReversed(checkoutSessionId: string): Promise<boolean> {
  const row = await prisma.stripeWebhookEvent.findUnique({
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
): Promise<void> {
  const id = unfulfilledId(stripeObjectId);
  const type = `${UNFULFILLED_TYPE_PREFIX}${reason}`;
  console.error('[payment-integrity] paid Stripe object not fulfilled', {
    stripeObjectId,
    reason,
  });
  await runSerializable(async (tx) => {
    // A fully refunded checkout session is owed nothing: keep it off the open list whichever
    // order Stripe delivered the refund and the checkout in. A dispute stays listed (it may
    // yet be won).
    const marker = await tx.stripeWebhookEvent.findUnique({
      where: { id: reversalId(stripeObjectId) },
    });
    const refunded = marker?.type === `${REVERSED_TYPE_PREFIX}refunded`;
    await tx.stripeWebhookEvent.upsert({
      where: { id },
      create: { id, type, ...(refunded ? { processedAt: new Date() } : {}) },
      update: refunded ? { type } : { type, processedAt: null },
    });
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
