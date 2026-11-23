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
 * A subscription's access is decided from Stripe invoice IDENTITY. Rows, keyed by the Stripe
 * subscription id (`sub_*`, which cannot collide with a checkout session id), written only by the
 * seat step:
 *
 *  - `payment-reversed:<sub>:<invoice>`: the exact state of one invoice's reversal (refunded,
 *    disputed, or dispute won). Looked up by invoice id, never by time.
 *  - `payment-reversed:<sub>`: the most recently created invoice with a reversal fact, with its id
 *    (`<state>@<invoice id>`). `processedAt` is that invoice's Stripe `created` time.
 *  - `subscription-paid:<sub>`: the most recently created invoice paid with money, with its id.
 *  - `subscription-ended:<sub>`: Stripe deleted the subscription. Terminal.
 *
 * `subscriptionAccessBlock` is the one decision every membership type (individual, Teams,
 * organisation, coaching) calls. The local rows settle it only when a DIFFERENT invoice was
 * created strictly later than the reversed one and paid (Stripe's creation times of two distinct
 * invoices). Anything else (the same invoice paid and reversed, two invoices created in the same
 * second, or no paid invoice recorded yet) is settled by Stripe's own answer: the subscription's
 * latest invoice, read BEFORE the transaction (`subscription-invoice-view.ts`) and matched by id
 * inside it. Missing or unreadable answers block; nothing here ever opens access on a guess.
 */
const SUBSCRIPTION_PAID_PREFIX = 'subscription-paid:';
const SUBSCRIPTION_PAID_TYPE = 'subscription_paid:invoice';
const ENDED_PREFIX = 'subscription-ended:';
const ENDED_TYPE = 'subscription_ended:deleted';
const INVOICE_SEPARATOR = '@';
/** Stands in for an invoice whose id Stripe did not give us. It never matches a real invoice. */
const UNKNOWN_INVOICE = 'unknown';
/** `type` is VarChar(128); the longest state plus the separator leaves room for this much id. */
const MAX_INVOICE_ID_LENGTH = 80;

function paidId(stripeSubscriptionId: string): string {
  return `${SUBSCRIPTION_PAID_PREFIX}${stripeSubscriptionId.trim()}`;
}
function endedId(stripeSubscriptionId: string): string {
  return `${ENDED_PREFIX}${stripeSubscriptionId.trim()}`;
}
function invoiceReversalId(stripeSubscriptionId: string, invoiceId: string): string {
  return `${REVERSAL_PREFIX}${stripeSubscriptionId.trim()}:${invoiceId}`;
}

/** Why a subscription gives no access: its latest payment was reversed, or Stripe deleted it. */
export type SubscriptionAccessBlock = 'payment_reversed' | 'deleted';

/** One subscription invoice: its Stripe id (null when Stripe did not give one) and `created`. */
export type SubscriptionInvoiceRef = { id: string | null; createdAt: Date };

/** The invoice id stored for `invoice`: its Stripe id, or the never-matching unknown id. */
function storedInvoiceId(invoice: SubscriptionInvoiceRef): string {
  const id = invoice.id?.trim();
  return id && id.length <= MAX_INVOICE_ID_LENGTH && !id.includes(INVOICE_SEPARATOR) ? id : UNKNOWN_INVOICE;
}

type ReversalState = 'refunded' | 'disputed' | 'dispute_won';

function reversalType(state: ReversalState): string {
  return state === 'dispute_won' ? DISPUTE_WON_TYPE : `${REVERSED_TYPE_PREFIX}${state}`;
}
function reversalState(type: string | undefined): ReversalState | null {
  if (type === DISPUTE_WON_TYPE) return 'dispute_won';
  if (type === `${REVERSED_TYPE_PREFIX}refunded`) return 'refunded';
  if (type === `${REVERSED_TYPE_PREFIX}disputed`) return 'disputed';
  return null;
}
function blocks(state: ReversalState | null): boolean {
  return state === 'refunded' || state === 'disputed';
}

/**
 * One invoice's next reversal state. A refund is terminal and wins over a dispute; a won dispute
 * lifts a dispute, never a refund; a dispute arriving after its win (a delayed dispute-created
 * event) changes nothing.
 */
function nextReversalState(current: ReversalState | null, incoming: ReversalState): ReversalState {
  if (current === 'refunded' || incoming === 'refunded') return 'refunded';
  if (incoming === 'dispute_won') return 'dispute_won';
  return current === 'dispute_won' ? 'dispute_won' : 'disputed';
}

type InvoiceFact = { state: string; invoiceId: string; createdAt: Date };

function parseInvoiceFact(row: { type: string; processedAt: Date | null } | null): InvoiceFact | null {
  if (!row) return null;
  const at = row.type.lastIndexOf(INVOICE_SEPARATOR);
  return {
    state: at < 0 ? row.type : row.type.slice(0, at),
    invoiceId: at < 0 ? UNKNOWN_INVOICE : row.type.slice(at + 1),
    createdAt: row.processedAt ?? new Date(0),
  };
}

async function readFact(tx: Prisma.TransactionClient | typeof prisma, id: string): Promise<InvoiceFact | null> {
  return parseInvoiceFact(await tx.stripeWebhookEvent.findUnique({ where: { id } }));
}

async function writeFact(tx: Prisma.TransactionClient, id: string, state: string, invoiceId: string, createdAt: Date): Promise<void> {
  const type = `${state}${INVOICE_SEPARATOR}${invoiceId}`;
  await tx.stripeWebhookEvent.upsert({
    where: { id },
    create: { id, type, processedAt: createdAt },
    update: { type, processedAt: createdAt },
  });
}

/** Record a reversal fact for one invoice: its own row by id, then the most-recent pointer. */
async function recordSubscriptionInvoiceReversal(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  invoice: SubscriptionInvoiceRef,
  incoming: ReversalState,
): Promise<void> {
  const invoiceId = storedInvoiceId(invoice);
  const ownId = invoiceReversalId(stripeSubscriptionId, invoiceId);
  const own = await tx.stripeWebhookEvent.findUnique({ where: { id: ownId } });
  const next = nextReversalState(reversalState(own?.type), incoming);
  await tx.stripeWebhookEvent.upsert({
    where: { id: ownId },
    create: { id: ownId, type: reversalType(next), processedAt: invoice.createdAt },
    update: { type: reversalType(next) },
  });

  const pointerId = reversalId(stripeSubscriptionId);
  const pointer = await readFact(tx, pointerId);
  const at = invoice.createdAt.getTime();
  const pointerAt = pointer?.createdAt.getTime() ?? 0;
  const replace =
    !pointer ||
    pointer.invoiceId === invoiceId ||
    at > pointerAt ||
    // Two invoices created in the same second: keep the one that blocks (a refund over a dispute,
    // either over a won dispute). Which of them is current is settled by Stripe's answer.
    (at === pointerAt && blocks(next) && reversalState(pointer.state) !== 'refunded');
  if (replace) await writeFact(tx, pointerId, reversalType(next), invoiceId, invoice.createdAt);
}

/** Record the full refund or chargeback of one subscription invoice. */
export function recordSubscriptionPaymentReversed(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  reason: PaymentReversalReason,
  invoice: SubscriptionInvoiceRef,
): Promise<void> {
  return recordSubscriptionInvoiceReversal(tx, stripeSubscriptionId, invoice, reason);
}

/** A dispute of one subscription invoice was won: that invoice's dispute (never a refund) lifts. */
export function clearSubscriptionDisputedReversal(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  invoice: SubscriptionInvoiceRef,
): Promise<void> {
  return recordSubscriptionInvoiceReversal(tx, stripeSubscriptionId, invoice, 'dispute_won');
}

/**
 * Record a subscription invoice paid with money. Keeps the most recently created one; an invoice
 * created in the same second as the kept one leaves it (Stripe's answer settles such a tie).
 */
export async function recordSubscriptionInvoicePaid(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  invoice: SubscriptionInvoiceRef,
): Promise<void> {
  const id = paidId(stripeSubscriptionId);
  const existing = await readFact(tx, id);
  if (existing && existing.createdAt.getTime() >= invoice.createdAt.getTime()) return;
  await writeFact(tx, id, SUBSCRIPTION_PAID_TYPE, storedInvoiceId(invoice), invoice.createdAt);
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

/** Stripe's latest invoice for the subscription, as read before the transaction. */
export type LatestSubscriptionInvoice = { id: string; createdAt: Date; paidWithMoney: boolean };

/**
 * What Stripe said about the subscription's latest invoice, read before the transaction:
 *  - `latest` absent: not read (the rows did not call for it when the read was made);
 *  - `null`: the subscription has no latest invoice; `'unavailable'`: Stripe could not be read;
 *  - `settleClosed`: the reads never settled; decide without Stripe, blocking.
 */
export type SubscriptionInvoiceView = {
  latest?: LatestSubscriptionInvoice | null | 'unavailable';
  settleClosed?: boolean;
};

/**
 * Thrown inside the transaction when the view cannot decide it: Stripe was not read, or the
 * ledger now holds an invoice created after the one Stripe called latest (a reversal or payment
 * recorded after the read). The caller reads Stripe again and reruns the transaction.
 */
export class StaleSubscriptionInvoiceView extends Error {
  constructor(stripeSubscriptionId: string) {
    super(`Stripe invoice view for ${stripeSubscriptionId} is out of date`);
    this.name = 'StaleSubscriptionInvoiceView';
  }
}

/** Whether the rows, as they stand, need Stripe's latest invoice to decide access. */
export async function subscriptionAccessNeedsLatestInvoice(
  db: Prisma.TransactionClient | typeof prisma,
  stripeSubscriptionId: string,
): Promise<boolean> {
  if (!stripeSubscriptionId?.trim()) return false;
  const reversal = await readFact(db, reversalId(stripeSubscriptionId));
  return !!reversal && blocks(reversalState(reversal.state));
}

/** Whether the reversed invoice still decides access, settled by Stripe's latest invoice. */
async function reversalStillCurrent(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  reversal: InvoiceFact,
  paid: InvoiceFact | null,
  view: SubscriptionInvoiceView,
): Promise<boolean> {
  if (view.settleClosed || reversal.invoiceId === UNKNOWN_INVOICE) return true;
  const latest = view.latest;
  if (latest === undefined) throw new StaleSubscriptionInvoiceView(stripeSubscriptionId);
  if (latest === null || latest === 'unavailable') return true;
  for (const fact of [reversal, paid]) {
    if (fact && fact.invoiceId !== latest.id && fact.createdAt.getTime() > latest.createdAt.getTime()) {
      throw new StaleSubscriptionInvoiceView(stripeSubscriptionId);
    }
  }
  if (latest.id === reversal.invoiceId) return true;
  const latestReversal = await tx.stripeWebhookEvent.findUnique({
    where: { id: invoiceReversalId(stripeSubscriptionId, latest.id) },
  });
  if (blocks(reversalState(latestReversal?.type))) return true;
  return !latest.paidWithMoney;
}

/**
 * What blocks this subscription's access, or null: the one decision for every membership type.
 * Callers pass their own transaction (a reversal committing concurrently is seen or serialised
 * after it) and the Stripe view read before it (`runWithSubscriptionInvoiceView`). A reversal of
 * the latest payment takes precedence over a deletion (its status gives no paid-through time).
 */
export async function subscriptionAccessBlock(
  tx: Prisma.TransactionClient,
  stripeSubscriptionId: string,
  view: SubscriptionInvoiceView,
): Promise<SubscriptionAccessBlock | null> {
  if (!stripeSubscriptionId?.trim()) return null;
  const reversal = await readFact(tx, reversalId(stripeSubscriptionId));
  if (reversal && blocks(reversalState(reversal.state))) {
    const paid = await readFact(tx, paidId(stripeSubscriptionId));
    const newerPaid =
      !!paid && paid.invoiceId !== reversal.invoiceId && paid.createdAt.getTime() > reversal.createdAt.getTime();
    if (!newerPaid && (await reversalStillCurrent(tx, stripeSubscriptionId, reversal, paid, view))) {
      return 'payment_reversed';
    }
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
  options: { subscription?: SubscriptionInvoiceView } = {},
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
      ? (await subscriptionAccessBlock(tx, stripeObjectId, options.subscription)) !== null
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
