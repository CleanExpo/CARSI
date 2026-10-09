/**
 * Persistence for CARSI Business Coaching ($495/mo). Separate from `LmsSubscription`.
 */

import type Stripe from 'stripe';

import type { CoachingMonthlyAction, CoachingPortalWorkspace } from '@/lib/coaching-portal/types';
import { EMPTY_COACHING_PORTAL_WORKSPACE } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';
import {
  readCancelAtPeriodEnd,
  readCurrentPeriodEnd,
  readCustomerId,
} from '@/lib/server/stripe-subscription-map';
import { resolveUserIdForStripeSubscription } from '@/lib/server/subscription-store';

export interface CoachingSubscriptionUpsertInput {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  eventTimestamp?: Date | null;
}

export async function upsertCoachingMonthlySubscription(
  input: CoachingSubscriptionUpsertInput,
): Promise<void> {
  const data = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    statusEventAt: input.eventTimestamp ?? null,
  };

  if (input.eventTimestamp) {
    const existing = await prisma.carsiCoachingMonthlySubscription.findUnique({
      where: { userId: input.userId },
      select: { statusEventAt: true },
    });
    if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
      return;
    }
  }

  await prisma.carsiCoachingMonthlySubscription.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...data },
    update: data,
  });
}

export async function markCoachingSubscriptionStatusBySubscriptionId(
  stripeSubscriptionId: string,
  status: string,
): Promise<void> {
  await prisma.carsiCoachingMonthlySubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status },
  });
}

export async function upsertTerminalCoachingSubscriptionStatus(input: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  eventTimestamp: Date;
}): Promise<void> {
  const existing = await prisma.carsiCoachingMonthlySubscription.findUnique({
    where: { userId: input.userId },
    select: { statusEventAt: true },
  });
  if (existing?.statusEventAt && existing.statusEventAt > input.eventTimestamp) {
    return;
  }

  const data = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.status,
    statusEventAt: input.eventTimestamp,
  };

  await prisma.carsiCoachingMonthlySubscription.upsert({
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

export async function resolveUserIdForCoachingSubscription(
  subscription: Stripe.Subscription,
  fallbackEmail: string | null,
): Promise<string | null> {
  const userId = await resolveUserIdForStripeSubscription(subscription, fallbackEmail);
  if (userId) return userId;

  if (typeof subscription.id === 'string') {
    const existing = await prisma.carsiCoachingMonthlySubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { userId: true },
    });
    if (existing) return existing.userId;
  }

  return null;
}

export async function upsertCoachingSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  eventTimestamp: Date | null,
  fallbackEmail: string | null,
): Promise<void> {
  const userId = await resolveUserIdForCoachingSubscription(subscription, fallbackEmail);
  if (!userId) {
    console.warn('[coaching-subscription] could not resolve user; skipping', {
      subscriptionId: subscription.id,
    });
    return;
  }

  await upsertCoachingMonthlySubscription({
    userId,
    stripeCustomerId: readCustomerId(subscription),
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: readCurrentPeriodEnd(subscription),
    cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
    eventTimestamp,
  });
}

function parseActionsJson(raw: string | null | undefined): CoachingMonthlyAction[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CoachingMonthlyAction => {
        if (!item || typeof item !== 'object') return false;
        const row = item as CoachingMonthlyAction;
        return (
          typeof row.id === 'string' &&
          typeof row.title === 'string' &&
          ['todo', 'in_progress', 'done', 'blocked'].includes(row.status)
        );
      })
      .map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
      }));
  } catch {
    return [];
  }
}

export function workspaceFromRow(row: {
  horizontalSummary: string | null;
  directionSummary: string | null;
  sessionPrepNotes: string | null;
  monthlyActionsJson: string | null;
}): CoachingPortalWorkspace {
  return {
    horizontalSummary: row.horizontalSummary?.trim() ?? '',
    directionSummary: row.directionSummary?.trim() ?? '',
    sessionPrepNotes: row.sessionPrepNotes?.trim() ?? '',
    monthlyActions: parseActionsJson(row.monthlyActionsJson),
  };
}

export function serializeMonthlyActions(actions: CoachingMonthlyAction[]): string {
  return JSON.stringify(actions);
}

export async function getCoachingPortalRowForUser(userId: string) {
  return prisma.carsiCoachingMonthlySubscription.findUnique({
    where: { userId },
  });
}

export async function updateCoachingPortalWorkspace(
  userId: string,
  workspace: CoachingPortalWorkspace,
): Promise<CoachingPortalWorkspace> {
  const row = await prisma.carsiCoachingMonthlySubscription.update({
    where: { userId },
    data: {
      horizontalSummary: workspace.horizontalSummary.trim() || null,
      directionSummary: workspace.directionSummary.trim() || null,
      sessionPrepNotes: workspace.sessionPrepNotes.trim() || null,
      monthlyActionsJson: serializeMonthlyActions(workspace.monthlyActions),
    },
    select: {
      horizontalSummary: true,
      directionSummary: true,
      sessionPrepNotes: true,
      monthlyActionsJson: true,
    },
  });
  return workspaceFromRow(row);
}

export function defaultWorkspaceForNewSubscriber(): CoachingPortalWorkspace {
  return {
    ...EMPTY_COACHING_PORTAL_WORKSPACE,
    monthlyActions: [
      {
        id: 'welcome-1',
        title: 'Complete onboarding email from Phill’s team',
        status: 'todo',
      },
      {
        id: 'welcome-2',
        title: 'Draft your horizontal summary (what you bring today)',
        status: 'todo',
      },
      {
        id: 'welcome-3',
        title: 'Sketch 6 / 12 / 60 month direction in the Plan tab',
        status: 'todo',
      },
    ],
  };
}
