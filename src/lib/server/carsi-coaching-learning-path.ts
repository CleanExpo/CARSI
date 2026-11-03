/**
 * GP-633 (Coaching advantage A6) — prescribed learning path, stored on the action board.
 *
 * Each prescribed course is a `carsi_coaching_actions` row whose `goal_id` is
 * `course:<lms_courses.id>`. No new table or column: the board, its status filter and the
 * coach's view all keep working, and progress comes from the LMS tables that already exist.
 *
 * All database access goes through `LearningPathStore` so the rules are unit-tested without
 * Postgres; `prismaLearningPathStore` is the production implementation.
 */
import {
  DEFAULT_GAP_COURSE_MAP,
  LEARNING_GOAL_PREFIX,
  applyCoachPathAdjustment,
  detectAssessmentGaps,
  learningGoalId,
  mappedCourseSlugs,
  parseLearningGoalId,
  recommendLearningModules,
  rollupLearningProgress,
  type LearningCatalogueCourse,
  type LearningCourseProgress,
  type LearningGapArea,
  type RecommendedLearningModule,
} from '@/lib/coaching-portal/learning-path';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';

export type LearningActionRecord = {
  id: string;
  title: string;
  goalId: string | null;
  status: string;
  sortOrder: number;
};

export type LearningPathStore = {
  latestSubmittedAssessmentJson(userId: string): Promise<string | null>;
  /** Every board action for the member, in board order. */
  listActions(userId: string): Promise<LearningActionRecord[]>;
  createLearningActions(
    userId: string,
    rows: Array<{ courseId: string; title: string; description: string; sortOrder: number }>
  ): Promise<void>;
  updateAction(
    userId: string,
    id: string,
    data: { status?: CoachingActionStatus; sortOrder?: number }
  ): Promise<void>;
  deleteActions(userId: string, ids: string[]): Promise<void>;
  publishedCoursesBySlugs(slugs: string[]): Promise<LearningCatalogueCourse[]>;
  publishedCoursesByIds(ids: string[]): Promise<LearningCatalogueCourse[]>;
  completedCourseIds(userId: string): Promise<Set<string>>;
  courseProgress(userId: string, courseIds: string[]): Promise<Map<string, LearningCourseProgress>>;
};

export type LearningPathItem = {
  actionId: string;
  courseId: string;
  slug: string;
  title: string;
  status: CoachingActionStatus;
  percent: number;
  sortOrder: number;
};

const AREA_REASON: Record<LearningGapArea, string> = {
  marketing: 'marketing and online visibility',
  sales: 'enquiries and sales',
  money: 'pricing and profit',
  operations: 'operations and admin',
  technology: 'technology and automation',
};

function learningActionTitle(courseTitle: string): string {
  return `Complete the course: ${courseTitle}`.slice(0, 500);
}

function learningActionDescription(m: RecommendedLearningModule): string {
  return `Prescribed from your business assessment to build your ${AREA_REASON[m.area]}. Progress updates here as you work through the course.`;
}

export type AssignLearningPathResult =
  | { status: 'assigned'; modules: RecommendedLearningModule[] }
  | { status: 'already_assigned' | 'no_assessment' | 'no_gaps' | 'no_modules' };

/**
 * Prescribe courses from the member's latest submitted assessment. Runs once: if any learning
 * action already exists (assigned before, or shaped by the coach) it writes nothing, so a coach
 * removal is never undone by a re-run.
 */
export async function assignLearningPathFromAssessment(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<AssignLearningPathResult> {
  const actions = await store.listActions(userId);
  if (actions.some((a) => a.goalId?.startsWith(LEARNING_GOAL_PREFIX))) {
    return { status: 'already_assigned' };
  }
  const json = await store.latestSubmittedAssessmentJson(userId);
  if (!json) return { status: 'no_assessment' };

  const gaps = detectAssessmentGaps(parseAssessmentResponsesJson(json));
  if (gaps.length === 0) return { status: 'no_gaps' };

  const [catalogue, completed] = await Promise.all([
    store.publishedCoursesBySlugs(mappedCourseSlugs(DEFAULT_GAP_COURSE_MAP)),
    store.completedCourseIds(userId),
  ]);
  const modules = recommendLearningModules({
    gaps,
    courseMap: DEFAULT_GAP_COURSE_MAP,
    catalogue,
    completedCourseIds: completed,
  });
  if (modules.length === 0) return { status: 'no_modules' };

  const start = actions.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1;
  await store.createLearningActions(
    userId,
    modules.map((m, i) => ({
      courseId: m.courseId,
      title: learningActionTitle(m.title),
      description: learningActionDescription(m),
      sortOrder: start + i,
    }))
  );
  return { status: 'assigned', modules };
}

/**
 * Read the member's learning actions with live LMS progress, and write back any status the LMS
 * has moved (completion flips the action to done). A coach-set `blocked` holds until the course
 * is actually complete. Writes only when a status really changed.
 */
export async function syncLearningPath(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<LearningPathItem[]> {
  const learning = (await store.listActions(userId))
    .map((a) => ({ action: a, courseId: parseLearningGoalId(a.goalId) }))
    .filter((x): x is { action: LearningActionRecord; courseId: string } => x.courseId !== null);
  if (learning.length === 0) return [];

  const ids = learning.map((x) => x.courseId);
  const [courses, progress] = await Promise.all([
    store.publishedCoursesByIds(ids),
    store.courseProgress(userId, ids),
  ]);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const items: LearningPathItem[] = [];
  for (const { action, courseId } of learning) {
    const p = progress.get(courseId) ?? {
      enrolled: false,
      completed: false,
      lessonsTotal: 0,
      lessonsCompleted: 0,
    };
    const rolled = rollupLearningProgress(p);
    const status: CoachingActionStatus =
      action.status === 'blocked' && rolled.status !== 'done' ? 'blocked' : rolled.status;
    if (status !== action.status) await store.updateAction(userId, action.id, { status });
    const course = courseById.get(courseId);
    items.push({
      actionId: action.id,
      courseId,
      slug: course?.slug ?? '',
      title: course?.title ?? action.title,
      status,
      percent: rolled.percent,
      sortOrder: action.sortOrder,
    });
  }
  return items;
}

export type LearningPathAdjustmentInput = {
  addCourseIds?: string[];
  removeCourseIds?: string[];
  orderCourseIds?: string[];
};

/**
 * Coach review: remove, add (published courses only, no duplicates) and reorder the member's
 * learning actions. Business actions keep their place; learning actions keep the slots they
 * occupied, with new ones appended after the last board item.
 */
export async function adjustLearningPath(
  userId: string,
  input: LearningPathAdjustmentInput,
  store: LearningPathStore = prismaLearningPathStore
): Promise<LearningPathItem[]> {
  const actions = await store.listActions(userId);
  const learning = actions
    .map((a) => ({ action: a, courseId: parseLearningGoalId(a.goalId) }))
    .filter((x): x is { action: LearningActionRecord; courseId: string } => x.courseId !== null);
  const currentIds = learning.map((x) => x.courseId);

  const wantedAdds = (input.addCourseIds ?? []).filter((id) => !currentIds.includes(id));
  const addable = wantedAdds.length ? await store.publishedCoursesByIds(wantedAdds) : [];
  const addableIds = new Set(addable.map((c) => c.id));

  const next = applyCoachPathAdjustment(currentIds, {
    remove: input.removeCourseIds,
    add: wantedAdds.filter((id) => addableIds.has(id)),
    order: input.orderCourseIds,
  });

  const removedActionIds = learning
    .filter((x) => !next.includes(x.courseId))
    .map((x) => x.action.id);
  if (removedActionIds.length) await store.deleteActions(userId, removedActionIds);

  const kept = learning.filter((x) => next.includes(x.courseId));
  let tail = actions.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1;
  const slots = kept.map((x) => x.action.sortOrder).sort((a, b) => a - b);
  const toCreate: Array<{
    courseId: string;
    title: string;
    description: string;
    sortOrder: number;
  }> = [];

  for (const [i, courseId] of next.entries()) {
    const existing = kept.find((x) => x.courseId === courseId);
    const sortOrder = i < slots.length ? slots[i] : tail++;
    if (existing) {
      if (existing.action.sortOrder !== sortOrder) {
        await store.updateAction(userId, existing.action.id, { sortOrder });
      }
    } else {
      const course = addable.find((c) => c.id === courseId);
      if (!course) continue;
      toCreate.push({
        courseId,
        title: learningActionTitle(course.title),
        description: 'Added to your learning path by your coach.',
        sortOrder,
      });
    }
  }
  if (toCreate.length) await store.createLearningActions(userId, toCreate);

  const items = await syncLearningPath(userId, store);
  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** True when the action is a prescribed course (member cannot edit its status by hand). */
export function isLearningAction(goalId: string | null | undefined): boolean {
  return parseLearningGoalId(goalId) !== null;
}

const PUBLISHED = { status: 'published', isPublished: true } as const;

export const prismaLearningPathStore: LearningPathStore = {
  async latestSubmittedAssessmentJson(userId) {
    const row = await prisma.carsiCoachingAssessment.findFirst({
      where: { userId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      select: { responsesJson: true },
    });
    return row?.responsesJson ?? null;
  },
  async listActions(userId) {
    return prisma.carsiCoachingAction.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, goalId: true, status: true, sortOrder: true },
    });
  },
  async createLearningActions(userId, rows) {
    await prisma.carsiCoachingAction.createMany({
      data: rows.map((r) => ({
        userId,
        title: r.title,
        description: r.description,
        goalId: learningGoalId(r.courseId),
        status: 'todo',
        assignedTo: 'customer',
        sortOrder: r.sortOrder,
      })),
    });
  },
  async updateAction(userId, id, data) {
    await prisma.carsiCoachingAction.updateMany({
      where: { id, userId },
      data: {
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status !== undefined
          ? { status: data.status, completedAt: data.status === 'done' ? new Date() : null }
          : {}),
      },
    });
  },
  async deleteActions(userId, ids) {
    await prisma.carsiCoachingAction.deleteMany({ where: { userId, id: { in: ids } } });
  },
  async publishedCoursesBySlugs(slugs) {
    if (slugs.length === 0) return [];
    return prisma.lmsCourse.findMany({
      where: { slug: { in: slugs }, ...PUBLISHED },
      select: { id: true, slug: true, title: true },
    });
  },
  async publishedCoursesByIds(ids) {
    if (ids.length === 0) return [];
    return prisma.lmsCourse.findMany({
      where: { id: { in: ids }, ...PUBLISHED },
      select: { id: true, slug: true, title: true },
    });
  },
  async completedCourseIds(userId) {
    const rows = await prisma.lmsEnrollment.findMany({
      where: { studentId: userId, completedAt: { not: null }, status: { not: 'revoked' } },
      select: { courseId: true },
    });
    return new Set(rows.map((r) => r.courseId));
  },
  async courseProgress(userId, courseIds) {
    const out = new Map<string, LearningCourseProgress>();
    if (courseIds.length === 0) return out;
    const [enrolments, lessons, done] = await Promise.all([
      prisma.lmsEnrollment.findMany({
        where: { studentId: userId, courseId: { in: courseIds }, status: { not: 'revoked' } },
        select: { courseId: true, completedAt: true },
      }),
      prisma.lmsLesson.findMany({
        where: { module: { courseId: { in: courseIds } } },
        select: { module: { select: { courseId: true } } },
      }),
      prisma.lmsLessonProgress.findMany({
        where: {
          studentId: userId,
          completed: true,
          lesson: { module: { courseId: { in: courseIds } } },
        },
        select: { lesson: { select: { module: { select: { courseId: true } } } } },
      }),
    ]);
    for (const id of courseIds) {
      const e = enrolments.find((x) => x.courseId === id);
      out.set(id, {
        enrolled: Boolean(e),
        completed: Boolean(e?.completedAt),
        lessonsTotal: lessons.filter((l) => l.module.courseId === id).length,
        lessonsCompleted: done.filter((d) => d.lesson.module.courseId === id).length,
      });
    }
    return out;
  },
};

export type CoachingLearningMember = {
  userId: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: string;
};

/** Coaching members the coach can review (every monthly coaching subscription row). */
export async function listCoachingLearningMembers(): Promise<CoachingLearningMember[]> {
  const rows = await prisma.carsiCoachingMonthlySubscription.findMany({
    orderBy: { createdAt: 'desc' },
    select: { userId: true, status: true, user: { select: { email: true, fullName: true } } },
  });
  return rows.map((r) => ({
    userId: r.userId,
    email: r.user.email,
    fullName: r.user.fullName,
    subscriptionStatus: r.status,
  }));
}

/** Coach view of one member: the gaps behind the path, the path with progress, and add options. */
export async function getCoachLearningPathView(userId: string) {
  const json = await prismaLearningPathStore.latestSubmittedAssessmentJson(userId);
  const gaps = json ? detectAssessmentGaps(parseAssessmentResponsesJson(json)) : [];
  const [path, options] = await Promise.all([
    syncLearningPath(userId),
    prisma.lmsCourse.findMany({
      where: PUBLISHED,
      orderBy: { title: 'asc' },
      select: { id: true, slug: true, title: true },
    }),
  ]);
  return {
    hasAssessment: Boolean(json),
    gaps,
    path: path.sort((a, b) => a.sortOrder - b.sortOrder),
    options,
  };
}

/** Paths are only written for people who have a coaching membership row. */
export async function isCoachingMember(userId: string): Promise<boolean> {
  const row = await prisma.carsiCoachingMonthlySubscription.findUnique({
    where: { userId },
    select: { id: true },
  });
  return row !== null;
}
