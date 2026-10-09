import { randomUUID } from 'node:crypto';

import type { CoachingActionStatus, CoachingMonthlyAction } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';

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
};

function normalizeStatus(raw: string): CoachingActionStatus {
  return STATUS_MAP[raw] ?? 'todo';
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
      select: { id: true },
    });
    if (owned) {
      await prisma.carsiCoachingAction.update({ where: { id: owned.id }, data });
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
  const result = await prisma.carsiCoachingAction.deleteMany({
    where: { id: actionId, userId },
  });
  return result.count > 0;
}
