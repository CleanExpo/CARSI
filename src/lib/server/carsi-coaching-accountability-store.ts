/**
 * GP-635 — Prisma store for accountability on autopilot.
 *
 * No new table or column. KPIs and check-ins live in the member's growth plan
 * (`carsi_coaching_growth_plans.goals_json`, see `parseGrowthPlanGoals`); actions are the
 * existing `carsi_coaching_actions` rows. Writes are compare-and-set on the stored
 * `goals_json` text, so two writers can never silently overwrite each other.
 */
import {
  parseGrowthPlanGoals,
  serialiseGrowthPlanGoals,
  type AccountabilityAction,
} from '@/lib/coaching-portal/accountability';
import { LEARNING_REMOVED_STATUS } from '@/lib/coaching-portal/learning-path';
import { prisma } from '@/lib/prisma';
import type {
  AccountabilityMemberRecord,
  AccountabilityStore,
} from '@/lib/server/carsi-coaching-accountability';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

/** Upper bound on plans scanned by one coach view or scheduled run. */
const MEMBER_SCAN_LIMIT = 500;

const ACTION_SELECT = {
  id: true,
  userId: true,
  title: true,
  status: true,
  dueDate: true,
  goalId: true,
  assignedTo: true,
  completedAt: true,
} as const;

function encodeVersion(goalsJson: string | null): string {
  return JSON.stringify({ g: goalsJson });
}

function decodeVersion(version: string): string | null {
  const parsed = JSON.parse(version) as { g: string | null };
  return parsed.g;
}

function toAction(r: {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  goalId: string | null;
  assignedTo: string;
  completedAt: Date | null;
}): AccountabilityAction {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    dueDate: r.dueDate,
    goalId: r.goalId,
    assignedTo: r.assignedTo,
    completedAt: r.completedAt,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'P2002');
}

export const prismaAccountabilityStore: AccountabilityStore = {
  async readPlan(userId) {
    const row = await prisma.carsiCoachingGrowthPlan.findUnique({
      where: { userId },
      select: { goalsJson: true },
    });
    if (!row) return null;
    const doc = parseGrowthPlanGoals(row.goalsJson);
    return {
      userId,
      goals: doc.goals,
      accountability: doc.accountability,
      version: encodeVersion(row.goalsJson),
    };
  },

  async writeAccountability(userId, accountability, goals, expectedVersion) {
    const goalsJson = serialiseGrowthPlanGoals({ goals, accountability });
    if (expectedVersion === null) {
      try {
        // A member with no plan yet gets a draft plan row; the coach still approves the plan.
        await prisma.carsiCoachingGrowthPlan.create({ data: { userId, goalsJson } });
        return true;
      } catch (err) {
        if (isUniqueViolation(err)) return false;
        throw err;
      }
    }
    const { count } = await prisma.carsiCoachingGrowthPlan.updateMany({
      where: { userId, goalsJson: decodeVersion(expectedVersion) },
      data: { goalsJson },
    });
    return count === 1;
  },

  async listActions(userId) {
    const rows = await prisma.carsiCoachingAction.findMany({
      where: { userId, NOT: { status: LEARNING_REMOVED_STATUS } },
      select: ACTION_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toAction);
  },

  async listMembers({ coachId }) {
    const plans = await prisma.carsiCoachingGrowthPlan.findMany({
      where: { goalsJson: { contains: '"accountability"' } },
      select: {
        userId: true,
        goalsJson: true,
        user: {
          select: {
            email: true,
            fullName: true,
            emailOptOut: true,
            isActive: true,
            coachingBusinessProfile: { select: { businessName: true } },
          },
        },
      },
      orderBy: { userId: 'asc' },
      take: MEMBER_SCAN_LIMIT,
    });

    const candidates = plans
      .map((p) => ({ p, acc: parseGrowthPlanGoals(p.goalsJson).accountability }))
      .filter(
        (x): x is { p: (typeof plans)[number]; acc: NonNullable<typeof x.acc> } =>
          x.acc !== null && x.p.user.isActive && (!coachId || x.acc.coachId === coachId)
      );
    if (candidates.length === 0) return [];

    const actions = await prisma.carsiCoachingAction.findMany({
      where: {
        userId: { in: candidates.map((c) => c.p.userId) },
        NOT: { status: LEARNING_REMOVED_STATUS },
      },
      select: ACTION_SELECT,
    });
    const byUser = new Map<string, AccountabilityAction[]>();
    for (const a of actions) {
      const list = byUser.get(a.userId) ?? [];
      list.push(toAction(a));
      byUser.set(a.userId, list);
    }

    const out: AccountabilityMemberRecord[] = [];
    for (const { p, acc } of candidates) {
      const sub = await getCoachingPortalRowForUser(p.userId);
      const entitled = decideCoachingPortalEntitlement(
        sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
      ).entitled;
      const fullName = p.user.fullName?.trim() || null;
      out.push({
        userId: p.userId,
        label:
          p.user.coachingBusinessProfile?.businessName?.trim() ||
          fullName ||
          p.user.email.split('@')[0] ||
          'Member',
        firstName: fullName?.split(/\s+/)[0] ?? null,
        email: p.user.email,
        emailOptOut: p.user.emailOptOut,
        entitled,
        accountability: acc,
        actions: byUser.get(p.userId) ?? [],
      });
    }
    return out;
  },
};

export function getAccountabilityStore(): AccountabilityStore {
  return prismaAccountabilityStore;
}
