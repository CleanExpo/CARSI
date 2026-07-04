/**
 * Persistence for the individual annual membership (`LmsSubscription`).
 *
 * The Stripe webhook lifecycle (customer.subscription.created|updated|deleted,
 * invoice.paid, invoice.payment_failed) all funnel through `upsertSubscription`.
 * It is idempotent on `stripeSubscriptionId` (unique) so a replayed webhook
 * produces a single row and re-applies the same state, never a second grant.
 *
 * The Stripe subscription is mapped to a CARSI user by, in order:
 *  1. the `carsi_user_id` metadata we set at checkout, then
 *  2. the customer's email matched to an `lms_users` row.
 * If neither resolves, the event is skipped (logged) rather than guessed — we
 * never attach a membership to the wrong learner.
 */

import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';

export interface SubscriptionUpsertInput {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan?: string;
  /**
   * Stripe `event.created` (or a status_transitions timestamp) of the snapshot
   * being applied — the authoritative moment this state was true at Stripe. Used
   * as an out-of-order guard: when the stored row already carries a NEWER
   * `statusEventAt`, this (stale) snapshot is ignored. Omit for legacy/unordered
   * callers, which then always overwrite (previous behaviour).
   */
  eventTimestamp?: Date | null;
}

/**
 * Insert or update the membership row for a user. Idempotent: keyed on both the
 * unique `userId` and the unique `stripeSubscriptionId`.
 *
 * Out-of-order guard (GP-441): Stripe delivers webhooks at-least-once and NOT in
 * order. A late `customer.subscription.updated` (status `active`) arriving AFTER
 * `customer.subscription.deleted` would otherwise resurrect a canceled
 * membership. When `eventTimestamp` is supplied AND the stored row already has a
 * strictly newer `statusEventAt`, the incoming snapshot is discarded. Equal
 * timestamps still apply (idempotent replay of the same event is a no-op write).
 * When `eventTimestamp` is omitted, or the stored `statusEventAt` is NULL, the
 * write proceeds unconditionally (unchanged legacy behaviour).
 */
export async function upsertSubscription(input: SubscriptionUpsertInput): Promise<void> {
  const data = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    plan: input.plan ?? 'pro_annual',
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    statusEventAt: input.eventTimestamp ?? null,
  };

  if (input.eventTimestamp) {
    const existing = await prisma.lmsSubscription.findUnique({
      where: { userId: input.userId },
      select: { statusEventAt: true },
    });
    // Stored state is strictly newer than this event → the event is stale; drop it.
    if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
      return;
    }
  }

  await prisma.lmsSubscription.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...data },
    update: data,
  });
}

/**
 * Force a subscription row to a terminal status (used by
 * customer.subscription.deleted and subscription refund/dispute revocation)
 * without needing the full period snapshot. Updates by the unique subscription
 * id. No-op when the row does not exist — for the deleted-before-created race,
 * callers that CAN resolve the user should instead use
 * `upsertTerminalSubscriptionStatus` so the cancellation is sticky.
 */
export async function markSubscriptionStatusBySubscriptionId(
  stripeSubscriptionId: string,
  status: string,
): Promise<void> {
  await prisma.lmsSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status },
  });
}

/**
 * Write a TERMINAL (canceled) subscription state that is sticky against
 * out-of-order delivery. Two hazards this closes (GP-441):
 *
 *  1. deleted-before-created: `customer.subscription.deleted` can arrive before
 *     the row exists. `markSubscriptionStatusBySubscriptionId` would no-op and
 *     the cancellation would be lost when `created` later inserts an active row.
 *     Here we UPSERT (create if absent) so the canceled state is recorded.
 *  2. stale active after cancel: a late `updated`/`created` (active) arriving
 *     after this cancel must not win. We stamp `statusEventAt` with the cancel
 *     event's timestamp; the ordinary `upsertSubscription` guard then discards
 *     any snapshot whose event timestamp is older than this cancel.
 *
 * Idempotent: re-delivery re-applies the same canceled row.
 */
export async function upsertTerminalSubscriptionStatus(input: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  eventTimestamp: Date;
  plan?: string;
}): Promise<void> {
  const existing = await prisma.lmsSubscription.findUnique({
    where: { userId: input.userId },
    select: { statusEventAt: true },
  });
  // A strictly newer stored state (e.g. a genuine later reactivation) wins over
  // a stale cancel event. Equal timestamps apply (idempotent).
  if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
    return;
  }

  const data = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    plan: input.plan ?? 'pro_annual',
    // A canceled membership has no forward-looking paid period; leave existing
    // period end untouched on update, null on create.
    statusEventAt: input.eventTimestamp,
  };

  await prisma.lmsSubscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      ...data,
    },
    update: data,
  });
}

/**
 * Resolve the CARSI user id for a Stripe subscription/customer, using our
 * checkout metadata first and the customer email second. Returns null when the
 * learner cannot be resolved (caller should log-and-skip, not guess).
 */
export async function resolveUserIdForStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackEmail: string | null,
): Promise<string | null> {
  const metaUserId =
    typeof subscription.metadata?.carsi_user_id === 'string'
      ? subscription.metadata.carsi_user_id.trim()
      : '';
  if (metaUserId) {
    const byId = await prisma.lmsUser.findUnique({ where: { id: metaUserId }, select: { id: true } });
    if (byId) return byId.id;
  }

  const email = fallbackEmail?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }

  // Last resort: an existing membership row already keyed to this subscription.
  if (typeof subscription.id === 'string') {
    const existing = await prisma.lmsSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { userId: true },
    });
    if (existing) return existing.userId;
  }

  return null;
}
