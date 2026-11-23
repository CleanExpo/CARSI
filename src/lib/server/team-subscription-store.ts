/**
 * Persistence for the Teams seat subscription (`LmsTeamSubscription`, WS1-E2).
 *
 * Mirrors the individual `subscription-store.ts`: the Stripe webhook lifecycle
 * (customer.subscription.created|updated|deleted, invoice.paid,
 * invoice.payment_failed) funnels through `upsertTeamSubscription`. It is
 * idempotent on `stripeSubscriptionId` (unique) AND keyed on the unique
 * `teamId`, so a replayed webhook produces a single row and re-applies the same
 * state, never a second grant. Carries the same `statusEventAt` out-of-order
 * guard as the individual membership.
 *
 * The Stripe subscription is mapped to a CARSI team by, in order:
 *  1. the `carsi_team_id` metadata set at checkout, then
 *  2. an existing row already keyed to this subscription id.
 * If neither resolves, the event is skipped (logged) rather than guessed.
 */

import type Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import {
  runGuardedSubscriptionWrite,
  type SubscriptionRowLink,
} from '@/lib/server/subscription-access-guard';

export { readSubscriptionSeatQuantity } from '@/lib/server/team-subscription-store-pure';

export interface TeamSubscriptionUpsertInput {
  teamId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  seatLimit: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan?: string;
  /** Stripe event.created of the snapshot — out-of-order guard (see E1). */
  eventTimestamp?: Date | null;
}

/**
 * Insert or update the seat-subscription row for a team. Idempotent: keyed on
 * both the unique `teamId` and the unique `stripeSubscriptionId`. Applies the
 * same out-of-order guard as the individual membership: a snapshot whose
 * `eventTimestamp` is strictly older than the stored `statusEventAt` is dropped.
 * GP-641: runs in `runGuardedSubscriptionWrite`, so a reversed or deleted
 * subscription is written as `canceled`.
 */
/** The team's row link, for `runGuardedSubscriptionWrite`. */
function linkedTo(teamId: string): SubscriptionRowLink<void> {
  return {
    linkedSubscriptionId: async (tx) =>
      (await tx.lmsTeamSubscription.findUnique({ where: { teamId }, select: { stripeSubscriptionId: true } }))
        ?.stripeSubscriptionId,
    skipped: undefined,
  };
}

export async function upsertTeamSubscription(
  input: TeamSubscriptionUpsertInput,
): Promise<void> {
  await runGuardedSubscriptionWrite(input.stripeSubscriptionId, input.status, linkedTo(input.teamId), async (tx, status) => {
    if (input.eventTimestamp) {
      const existing = await tx.lmsTeamSubscription.findUnique({
        where: { teamId: input.teamId },
        select: { statusEventAt: true },
      });
      if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
        return;
      }
    }

    const data = {
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status,
      plan: input.plan ?? 'starter',
      seatLimit: input.seatLimit,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      statusEventAt: input.eventTimestamp ?? null,
    };
    await tx.lmsTeamSubscription.upsert({
      where: { teamId: input.teamId },
      create: { teamId: input.teamId, ...data },
      update: data,
    });
  });
}

/**
 * Write a TERMINAL (canceled) team seat subscription that is sticky against
 * out-of-order delivery (mirrors the individual `upsertTerminalSubscriptionStatus`).
 * Upserts so a deleted-before-created event is not lost; stamps `statusEventAt`
 * so a stale later `active` cannot resurrect it.
 */
export async function upsertTerminalTeamSubscriptionStatus(input: {
  teamId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  eventTimestamp: Date;
  plan?: string;
  seatLimit: number;
}): Promise<void> {
  await runGuardedSubscriptionWrite(input.stripeSubscriptionId, input.status, linkedTo(input.teamId), async (tx, status) => {
    const existing = await tx.lmsTeamSubscription.findUnique({
      where: { teamId: input.teamId },
      select: { statusEventAt: true },
    });
    if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
      return;
    }

    const data = {
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status,
      plan: input.plan ?? 'starter',
      seatLimit: input.seatLimit,
      statusEventAt: input.eventTimestamp,
    };

    await tx.lmsTeamSubscription.upsert({
      where: { teamId: input.teamId },
      create: {
        teamId: input.teamId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        ...data,
      },
      update: data,
    });
  });
}

/**
 * Resolve the CARSI team id for a Stripe subscription, using our checkout
 * metadata first and an existing row second. Returns null when the team cannot
 * be resolved (caller should log-and-skip, not guess).
 */
export async function resolveTeamIdForStripeSubscription(
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
    const existing = await prisma.lmsTeamSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { teamId: true },
    });
    if (existing) return existing.teamId;
  }

  return null;
}
