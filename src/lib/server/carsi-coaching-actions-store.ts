import { randomUUID } from 'node:crypto';

import {
  decideCoachReview,
  MARKETING_ACTION_GOAL_PREFIX,
  type CoachDecision,
  type ProposedActionInput,
} from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import {
  MEMBER_SETTABLE_ACTION_STATUSES,
  type CoachingActionStatus,
  type CoachingMonthlyAction,
  type MemberSettableActionStatus,
} from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';

const STATUS_MAP: Record<string, CoachingActionStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done',
  blocked: 'blocked',
  proposed: 'proposed',
  declined: 'declined',
};

/** Statuses only the coach can move an action out of. */
const COACH_HELD_STATUSES = ['proposed', 'declined'];

export type CoachingActionRow = {
  id: string;
  title: string;
  description: string | null;
  status: CoachingActionStatus;
  dueDate: Date | null;
  priority: string | null;
  progressNote: string | null;
  coachFeedback: string | null;
  goalId: string | null;
  createdAt: Date;
};

function normalizeStatus(raw: string): CoachingActionStatus {
  return STATUS_MAP[raw] ?? 'todo';
}

function memberStatus(raw: string | undefined): MemberSettableActionStatus {
  return (MEMBER_SETTABLE_ACTION_STATUSES as readonly string[]).includes(raw ?? '')
    ? (raw as MemberSettableActionStatus)
    : 'todo';
}

export async function listCoachingActionsForUser(userId: string): Promise<CoachingActionRow[]> {
  const rows = await prisma.carsiCoachingAction.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: normalizeStatus(r.status),
    dueDate: r.dueDate,
    priority: r.priority,
    progressNote: r.progressNote,
    coachFeedback: r.coachFeedback,
    goalId: r.goalId,
    createdAt: r.createdAt,
  }));
}

export async function importLegacyActionsFromSubscriptionJson(
  userId: string,
  monthlyActionsJson: string
): Promise<void> {
  const existing = await prisma.carsiCoachingAction.count({ where: { userId } });
  if (existing > 0) return;

  let legacy: CoachingMonthlyAction[] = [];
  try {
    const parsed = JSON.parse(monthlyActionsJson) as unknown;
    if (Array.isArray(parsed)) {
      legacy = parsed.filter((a): a is CoachingMonthlyAction =>
        Boolean(
          a && typeof a === 'object' && typeof (a as CoachingMonthlyAction).title === 'string'
        )
      );
    }
  } catch {
    return;
  }

  if (legacy.length === 0) return;

  await prisma.carsiCoachingAction.createMany({
    data: legacy.map((a, index) => ({
      id: a.id?.trim() ? a.id : randomUUID(),
      userId,
      title: a.title.slice(0, 500),
      status: memberStatus(a.status),
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export type UpsertCoachingActionResult = { ok: true } | { ok: false; reason: 'awaiting_coach' };

/**
 * Member create/edit. A member may only set the four working statuses, and may not edit an
 * action that is still proposed or was declined: approving is the coach's call (GP-634).
 */
export async function upsertCoachingActionForUser(
  userId: string,
  input: {
    id?: string;
    title: string;
    description?: string | null;
    status?: CoachingActionStatus;
    dueDate?: Date | null;
    priority?: string | null;
    progressNote?: string | null;
  }
): Promise<UpsertCoachingActionResult> {
  const status = memberStatus(input.status);
  const data = {
    title: input.title.slice(0, 500),
    description: input.description?.trim() || null,
    status,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? null,
    progressNote: input.progressNote?.trim() || null,
    completedAt: status === 'done' ? new Date() : null,
  };

  const existingId = input.id?.trim();
  if (existingId) {
    const owned = await prisma.carsiCoachingAction.findFirst({
      where: { id: existingId, userId },
      select: { id: true, status: true },
    });
    if (owned) {
      if (COACH_HELD_STATUSES.includes(owned.status))
        return { ok: false, reason: 'awaiting_coach' };
      await prisma.carsiCoachingAction.update({ where: { id: owned.id }, data });
      return { ok: true };
    }
  }

  await prisma.carsiCoachingAction.create({
    data: { id: existingId || randomUUID(), userId, ...data },
  });
  return { ok: true };
}

export async function deleteCoachingActionForUser(
  userId: string,
  actionId: string
): Promise<boolean> {
  const result = await prisma.carsiCoachingAction.deleteMany({
    where: { id: actionId, userId },
  });
  return result.count > 0;
}

/**
 * GP-634: write the marketing pack's proposed actions. Pending (still proposed) marketing
 * actions from an earlier pack are replaced; any fix the coach already approved or declined is
 * left alone and not proposed again. Returns the number of actions created.
 */
export async function replaceProposedMarketingActions(
  userId: string,
  actions: ProposedActionInput[],
  db: Pick<typeof prisma, 'carsiCoachingAction'> = prisma
): Promise<number> {
  const existing = await db.carsiCoachingAction.findMany({
    where: { userId },
    select: { id: true, status: true, goalId: true },
  });
  const marketing = existing.filter((a) => a.goalId?.startsWith(MARKETING_ACTION_GOAL_PREFIX));
  const reviewedGoals = new Set(
    marketing.filter((a) => a.status !== 'proposed').map((a) => a.goalId)
  );
  const pendingIds = marketing.filter((a) => a.status === 'proposed').map((a) => a.id);
  if (pendingIds.length > 0) {
    await db.carsiCoachingAction.deleteMany({
      where: { userId, status: 'proposed', id: { in: pendingIds } },
    });
  }
  let created = 0;
  for (const a of actions) {
    if (reviewedGoals.has(a.goalId)) continue;
    await db.carsiCoachingAction.create({
      data: {
        id: randomUUID(),
        userId,
        title: a.title,
        description: a.description,
        status: 'proposed',
        priority: a.priority,
        goalId: a.goalId,
        assignedTo: 'customer',
        sortOrder: a.sortOrder,
      },
    });
    created += 1;
  }
  return created;
}

export type ReviewProposedActionResult =
  { ok: true; status: 'todo' | 'declined' } | { ok: false; reason: 'not_found' | 'not_proposed' };

/**
 * Coach-only (caller must check the coach/admin session). Approve moves a proposed action onto
 * the member's to-do list; decline parks it. The status guard in the update makes a second,
 * concurrent review a no-op rather than a double transition.
 */
export async function reviewProposedCoachingAction(input: {
  actionId: string;
  decision: CoachDecision;
  coachFeedback?: string | null;
}): Promise<ReviewProposedActionResult> {
  const row = await prisma.carsiCoachingAction.findFirst({
    where: { id: input.actionId },
    select: { id: true, status: true },
  });
  if (!row) return { ok: false, reason: 'not_found' };
  const decision = decideCoachReview(row.status, input.decision);
  if (!decision.ok) return decision;
  const feedback = input.coachFeedback?.trim();
  const result = await prisma.carsiCoachingAction.updateMany({
    where: { id: row.id, status: 'proposed' },
    data: {
      status: decision.status,
      ...(feedback ? { coachFeedback: feedback.slice(0, 4000) } : {}),
    },
  });
  if (result.count === 0) return { ok: false, reason: 'not_proposed' };
  return { ok: true, status: decision.status };
}
