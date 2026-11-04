import { randomUUID } from 'node:crypto';

import { ASK_COACH_GOAL_PREFIX, isAskCoachGoalId } from '@/lib/coaching-portal/ask-my-coach';
import {
  LEARNING_GOAL_PREFIX,
  LEARNING_PROPOSED_STATUS,
  LEARNING_REMOVED_STATUS,
} from '@/lib/coaching-portal/learning-path';
import type { CoachingActionStatus, CoachingMonthlyAction } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';
import { isLearningAction, syncLearningPath } from '@/lib/server/carsi-coaching-learning-path';

/**
 * Rows the member never sees: coach-removed tombstones and draft courses the coach has not yet
 * approved (GP-633). Every member read and write goes through this list.
 */
const MEMBER_HIDDEN_STATUSES = [LEARNING_REMOVED_STATUS, LEARNING_PROPOSED_STATUS];

const STATUS_MAP: Record<string, CoachingActionStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done',
  blocked: 'blocked',
};

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
  /** Set when the action is a prescribed CARSI course (GP-633); progress comes from the LMS. */
  learning: { courseSlug: string; percent: number; enrolled: boolean } | null;
};

function normalizeStatus(raw: string): CoachingActionStatus {
  return STATUS_MAP[raw] ?? 'todo';
}

export async function listCoachingActionsForUser(userId: string): Promise<CoachingActionRow[]> {
  // Pull LMS progress onto learning actions first, so completion shows as done on the board.
  const learning = new Map((await syncLearningPath(userId)).map((i) => [i.actionId, i]));
  const rows = await prisma.carsiCoachingAction.findMany({
    // Tombstones and unapproved drafts stay hidden (status is NOT NULL, so NOT IN is safe).
    where: { userId, NOT: { status: { in: MEMBER_HIDDEN_STATUSES } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((r) => {
    const li = learning.get(r.id);
    return {
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
      learning: li ? { courseSlug: li.slug, percent: li.percent, enrolled: li.enrolled } : null,
    };
  });
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
      status: normalizeStatus(a.status),
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

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
): Promise<void> {
  const status = input.status ?? 'todo';
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
      select: { id: true, goalId: true, status: true },
    });
    // A row the member cannot see (an unapproved draft or a removed course) is not theirs to
    // edit, and must not be re-created under the same id either.
    if (owned && MEMBER_HIDDEN_STATUSES.includes(owned.status)) return;
    if (owned) {
      // A prescribed course's title and status follow the LMS, and a question to the coach
      // (GP-630) is closed by the coach's answer; on both the member can only add a note.
      const update =
        isLearningAction(owned.goalId) || isAskCoachGoalId(owned.goalId)
          ? { progressNote: data.progressNote }
          : data;
      await prisma.carsiCoachingAction.update({ where: { id: owned.id }, data: update });
      return;
    }
  }

  await prisma.carsiCoachingAction.create({
    data: { id: existingId || randomUUID(), userId, ...data },
  });
}

export async function deleteCoachingActionForUser(
  userId: string,
  actionId: string
): Promise<boolean> {
  // Prescribed courses are removed by the coach (admin learning-path review), not the member,
  // and a question sent to the coach (GP-630) stays until the coach has answered it.
  // goal_id is nullable, so "not a protected action" must include NULL explicitly.
  const result = await prisma.carsiCoachingAction.deleteMany({
    where: {
      id: actionId,
      userId,
      OR: [
        { goalId: null },
        {
          NOT: [
            { goalId: { startsWith: LEARNING_GOAL_PREFIX } },
            { goalId: { startsWith: ASK_COACH_GOAL_PREFIX } },
          ],
        },
      ],
    },
  });
  return result.count > 0;
}
