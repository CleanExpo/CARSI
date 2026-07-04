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
}

/**
 * Insert or update the membership row for a user. Idempotent: keyed on both the
 * unique `userId` and the unique `stripeSubscriptionId`.
 */
export async function upsertSubscription(input: SubscriptionUpsertInput): Promise<void> {
  const data = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    plan: input.plan ?? 'pro_annual',
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  };

  await prisma.lmsSubscription.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...data },
    update: data,
  });
}

/**
 * Force a subscription row to a terminal status (used by
 * customer.subscription.deleted) without needing the full period snapshot.
 * No-op if the row does not exist.
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
