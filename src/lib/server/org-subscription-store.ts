/**
 * Persistence for the organisation monthly subscription (`LmsOrgSubscription`,
 * WS1-E3). Mirrors the individual `subscription-store.ts` idempotent upsert and
 * `statusEventAt` out-of-order guard, keyed on the unique `teamId` (the org
 * container) and the unique `stripeSubscriptionId`.
 *
 * The Stripe subscription is mapped to a CARSI org (team) by, in order:
 *  1. the `carsi_team_id` metadata set at checkout / ops provisioning, then
 *  2. an existing row already keyed to this subscription id.
 */

import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';

export interface OrgSubscriptionUpsertInput {
  teamId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  eventTimestamp?: Date | null;
}

/**
 * Update an EXISTING org subscription row from a Stripe snapshot. The row is
 * created at checkout/provisioning time (when we know the organisation name +
 * contact email); the webhook only refreshes status/period/customer here.
 * Idempotent and guarded by `statusEventAt`. No-op if the row is absent (the
 * webhook cannot invent an org's name/contact) — logged by the caller.
 */
export async function updateOrgSubscriptionFromStripe(
  input: OrgSubscriptionUpsertInput,
): Promise<boolean> {
  const existing = await prisma.lmsOrgSubscription.findUnique({
    where: { teamId: input.teamId },
    select: { statusEventAt: true },
  });
  if (!existing) return false;

  if (
    input.eventTimestamp &&
    existing.statusEventAt &&
    existing.statusEventAt > input.eventTimestamp
  ) {
    return true; // stale event ignored, but the row exists — treat as handled.
  }

  await prisma.lmsOrgSubscription.update({
    where: { teamId: input.teamId },
    data: {
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      statusEventAt: input.eventTimestamp ?? null,
    },
  });
  return true;
}

/**
 * Create or refresh an org subscription row for a team. Used by ops
 * provisioning and by the checkout success path (where org name/contact are
 * known). Idempotent on `teamId`.
 */
export async function upsertOrgSubscription(input: {
  teamId: string;
  organisationName: string;
  contactEmail: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  entitledCategory?: string;
  eventTimestamp?: Date | null;
}): Promise<void> {
  if (input.eventTimestamp) {
    const existing = await prisma.lmsOrgSubscription.findUnique({
      where: { teamId: input.teamId },
      select: { statusEventAt: true },
    });
    if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
      return;
    }
  }

  const data = {
    organisationName: input.organisationName,
    contactEmail: input.contactEmail.trim().toLowerCase(),
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    statusEventAt: input.eventTimestamp ?? null,
    ...(input.entitledCategory ? { entitledCategory: input.entitledCategory } : {}),
  };

  await prisma.lmsOrgSubscription.upsert({
    where: { teamId: input.teamId },
    create: { teamId: input.teamId, seatModel: 'unlimited', ...data },
    update: data,
  });
}

/** Force an org subscription to a terminal status by subscription id. */
export async function markOrgSubscriptionStatusBySubscriptionId(
  stripeSubscriptionId: string,
  status: string,
): Promise<void> {
  await prisma.lmsOrgSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status },
  });
}

/**
 * Resolve the CARSI org (team) id for a Stripe subscription, using checkout
 * metadata first and an existing row second. Returns null when unresolvable.
 */
export async function resolveTeamIdForOrgSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metaTeamId =
    typeof subscription.metadata?.carsi_team_id === 'string'
      ? subscription.metadata.carsi_team_id.trim()
      : '';
  if (metaTeamId) {
    const byId = await prisma.lmsTeam.findUnique({
      where: { id: metaTeamId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  if (typeof subscription.id === 'string') {
    const existing = await prisma.lmsOrgSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { teamId: true },
    });
    if (existing) return existing.teamId;
  }

  return null;
}
