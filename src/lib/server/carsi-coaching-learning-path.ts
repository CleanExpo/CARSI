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
  LEARNING_GOAL_PREFIX,
  LEARNING_PROPOSED_STATUS,
  LEARNING_REMOVED_STATUS,
  applyCoachPathAdjustment,
  detectAssessmentGaps,
  learningGoalId,
  mappedCourseSlugs,
  parseLearningGoalId,
  recommendLearningModules,
  rollupLearningProgress,
  type GapCourseMap,
  type LearningCatalogueCourse,
  type LearningCourseProgress,
  type LearningGapArea,
  type RecommendedLearningModule,
} from '@/lib/coaching-portal/learning-path';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';
import { loadGapCourseMap, prismaGapMapStoreFor } from '@/lib/server/carsi-coaching-gap-map';

/** Statuses a learning action can be written with: board statuses, a draft, or a tombstone. */
export type LearningActionWriteStatus =
  CoachingActionStatus | typeof LEARNING_PROPOSED_STATUS | typeof LEARNING_REMOVED_STATUS;

export type LearningActionRecord = {
  id: string;
  title: string;
  goalId: string | null;
  status: string;
  sortOrder: number;
};

export type LearningPathStore = {
  /**
   * Run `fn` holding a per-member write lock, with a store bound to that lock. Assignment and
   * coach edits read-then-write, so two at once would otherwise duplicate courses (review r1 P1).
   */
  withMemberLock<T>(userId: string, fn: (locked: LearningPathStore) => Promise<T>): Promise<T>;
  latestSubmittedAssessmentJson(userId: string): Promise<string | null>;
  /** Every board action for the member, in board order. */
  listActions(userId: string): Promise<LearningActionRecord[]>;
  createLearningActions(
    userId: string,
    rows: Array<{
      courseId: string;
      title: string;
      description: string;
      sortOrder: number;
      /** `proposed` (draft, hidden from the member) or `todo` (live). Defaults to `todo`. */
      status?: typeof LEARNING_PROPOSED_STATUS | 'todo';
    }>
  ): Promise<void>;
  /**
   * Compare-and-set: writes only if the row still has `expectedStatus` (the status the caller
   * read), and reports whether it wrote. A writer acting on a stale read changes nothing, so a
   * progress sync can never overwrite a coach removal that landed mid-read (review r3 P1).
   */
  updateAction(
    userId: string,
    id: string,
    expectedStatus: string,
    data: { status?: LearningActionWriteStatus; sortOrder?: number }
  ): Promise<boolean>;
  /** The gap-to-course map: built-in default with the coach's edits laid over it. */
  gapCourseMap(): Promise<GapCourseMap>;
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
  /** Member holds a live enrolment, so the lesson player will open for them. */
  enrolled: boolean;
};

/** Coach-side path item: drafts included, flagged so the coach knows what still needs approval. */
export type CoachLearningPathItem = LearningPathItem & { draft: boolean };

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
 * Prescribe courses from the member's latest submitted assessment, as a DRAFT the coach must
 * approve before the member sees it. Runs once: if any learning
 * action already exists (assigned before, or shaped by the coach) it writes nothing, so a coach
 * removal is never undone by a re-run.
 */
export async function assignLearningPathFromAssessment(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<AssignLearningPathResult> {
  return store.withMemberLock(userId, (locked) => assignLocked(userId, locked));
}

async function assignLocked(
  userId: string,
  store: LearningPathStore
): Promise<AssignLearningPathResult> {
  const actions = await store.listActions(userId);
  if (actions.some((a) => a.goalId?.startsWith(LEARNING_GOAL_PREFIX))) {
    return { status: 'already_assigned' };
  }
  const json = await store.latestSubmittedAssessmentJson(userId);
  if (!json) return { status: 'no_assessment' };

  const gaps = detectAssessmentGaps(parseAssessmentResponsesJson(json));
  if (gaps.length === 0) return { status: 'no_gaps' };

  // Sequential on purpose: these run on the locked transaction's single connection.
  const courseMap = await store.gapCourseMap();
  const catalogue = await store.publishedCoursesBySlugs(mappedCourseSlugs(courseMap));
  const completed = await store.completedCourseIds(userId);
  const modules = recommendLearningModules({
    gaps,
    courseMap,
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
      // A draft until the coach approves it: the member sees nothing yet (GP-633 spec).
      status: LEARNING_PROPOSED_STATUS,
    }))
  );
  return { status: 'assigned', modules };
}

/**
 * Read the member's learning actions with live LMS progress, and write back any status the LMS
 * has moved (completion flips the action to done). A coach-set `blocked` holds until the course
 * is actually complete. Writes only when a status really changed.
 */
type LearningRow = { action: LearningActionRecord; courseId: string };

/**
 * Learning rows, split into live (the member sees them), drafts awaiting coach approval, and
 * coach-removed tombstones.
 */
function splitLearningRows(actions: LearningActionRecord[]): {
  active: LearningRow[];
  proposed: LearningRow[];
  removed: LearningRow[];
} {
  const rows = actions
    .map((a) => ({ action: a, courseId: parseLearningGoalId(a.goalId) }))
    .filter((x): x is LearningRow => x.courseId !== null);
  const hidden = (s: string) => s === LEARNING_REMOVED_STATUS || s === LEARNING_PROPOSED_STATUS;
  return {
    active: rows.filter((x) => !hidden(x.action.status)),
    proposed: rows.filter((x) => x.action.status === LEARNING_PROPOSED_STATUS),
    removed: rows.filter((x) => x.action.status === LEARNING_REMOVED_STATUS),
  };
}

const NO_PROGRESS: LearningCourseProgress = {
  enrolled: false,
  completed: false,
  lessonsTotal: 0,
  lessonsCompleted: 0,
};

/**
 * The member's LIVE learning path with LMS progress. Drafts and tombstones are never returned
 * and never written, so a path the coach has not approved cannot reach the member's board.
 */
export async function syncLearningPath(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<LearningPathItem[]> {
  const learning = splitLearningRows(await store.listActions(userId)).active;
  if (learning.length === 0) return [];

  const ids = learning.map((x) => x.courseId);
  const [courses, progress] = await Promise.all([
    store.publishedCoursesByIds(ids),
    store.courseProgress(userId, ids),
  ]);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const items: LearningPathItem[] = [];
  for (const { action, courseId } of learning) {
    const p = progress.get(courseId) ?? NO_PROGRESS;
    const rolled = rollupLearningProgress(p);
    const status: CoachingActionStatus =
      action.status === 'blocked' && rolled.status !== 'done' ? 'blocked' : rolled.status;
    if (status !== action.status) {
      const wrote = await store.updateAction(userId, action.id, action.status, { status });
      // The row changed under this read (e.g. the coach removed it): report nothing stale.
      if (!wrote) continue;
    }
    const course = courseById.get(courseId);
    items.push({
      actionId: action.id,
      courseId,
      slug: course?.slug ?? '',
      title: course?.title ?? action.title,
      status,
      percent: rolled.percent,
      sortOrder: action.sortOrder,
      enrolled: p.enrolled,
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
): Promise<CoachLearningPathItem[]> {
  await store.withMemberLock(userId, (locked) => adjustLocked(userId, input, locked));
  return coachLearningPath(userId, store);
}

/**
 * The coach's view of the path: live items (synced with the LMS, as the member sees them) plus
 * drafts with read-only progress, in board order. Drafts are never written here.
 */
export async function coachLearningPath(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<CoachLearningPathItem[]> {
  const live = (await syncLearningPath(userId, store)).map((i) => ({ ...i, draft: false }));
  const drafts = splitLearningRows(await store.listActions(userId)).proposed;
  if (drafts.length === 0) return live.sort((a, b) => a.sortOrder - b.sortOrder);

  const ids = drafts.map((d) => d.courseId);
  const [courses, progress] = await Promise.all([
    store.publishedCoursesByIds(ids),
    store.courseProgress(userId, ids),
  ]);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const draftItems: CoachLearningPathItem[] = drafts.map(({ action, courseId }) => {
    const p = progress.get(courseId) ?? NO_PROGRESS;
    const course = courseById.get(courseId);
    return {
      actionId: action.id,
      courseId,
      slug: course?.slug ?? '',
      title: course?.title ?? action.title,
      status: 'todo',
      percent: rollupLearningProgress(p).percent,
      sortOrder: action.sortOrder,
      enrolled: p.enrolled,
      draft: true,
    };
  });
  return [...live, ...draftItems].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Coach approval: every draft course on the member's path goes live (`todo`) in one step, under
 * the member lock, compare-and-set. The progress sync then gives each its real status. Courses
 * the coach removed stay removed.
 */
export async function approveLearningPath(
  userId: string,
  store: LearningPathStore = prismaLearningPathStore
): Promise<{ approved: number; path: CoachLearningPathItem[] }> {
  const approved = await store.withMemberLock(userId, async (locked) => {
    const drafts = splitLearningRows(await locked.listActions(userId)).proposed;
    for (const d of drafts) await coachWrite(locked, userId, d.action, { status: 'todo' });
    return drafts.length;
  });
  return { approved, path: await coachLearningPath(userId, store) };
}

/**
 * A coach edit, written compare-and-set. The coach holds the member lock, so the only other
 * writer is a progress sync, which can move the status once between our read and our write.
 * Re-read and retry (bounded) so the coach's decision always lands; never blind-overwrite.
 */
async function coachWrite(
  store: LearningPathStore,
  userId: string,
  action: LearningActionRecord,
  data: Parameters<LearningPathStore['updateAction']>[3]
): Promise<void> {
  let expected = action.status;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await store.updateAction(userId, action.id, expected, data)) return;
    const fresh = (await store.listActions(userId)).find((a) => a.id === action.id);
    if (!fresh) return;
    expected = fresh.status;
  }
  throw new Error(`learning path: could not apply coach edit to action ${action.id}`);
}

async function adjustLocked(
  userId: string,
  input: LearningPathAdjustmentInput,
  store: LearningPathStore
): Promise<void> {
  const actions = await store.listActions(userId);
  const split = splitLearningRows(actions);
  const removed = split.removed;
  // The coach edits the whole path, drafts included, in board order.
  const learning = [...split.active, ...split.proposed].sort(
    (a, b) => a.action.sortOrder - b.action.sortOrder
  );
  const currentIds = learning.map((x) => x.courseId);
  // While a draft is waiting, anything the coach adds joins the draft; once the path is live,
  // the coach adding a course is itself the approval.
  const newStatus = split.proposed.length > 0 ? LEARNING_PROPOSED_STATUS : 'todo';

  const wantedAdds = (input.addCourseIds ?? []).filter((id) => !currentIds.includes(id));
  const addable = wantedAdds.length ? await store.publishedCoursesByIds(wantedAdds) : [];
  const addableIds = new Set(addable.map((c) => c.id));

  const next = applyCoachPathAdjustment(currentIds, {
    remove: input.removeCourseIds,
    add: wantedAdds.filter((id) => addableIds.has(id)),
    order: input.orderCourseIds,
  });

  // Removal keeps the row as a tombstone: it leaves the board, and the "already assigned"
  // guard still sees it, so a full clear is never re-prescribed (review r2 P1).
  for (const x of learning.filter((l) => !next.includes(l.courseId))) {
    await coachWrite(store, userId, x.action, { status: LEARNING_REMOVED_STATUS });
  }

  const kept = learning.filter((x) => next.includes(x.courseId));
  let tail = actions.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1;
  const slots = kept.map((x) => x.action.sortOrder).sort((a, b) => a - b);
  const toCreate: Parameters<LearningPathStore['createLearningActions']>[1] = [];

  for (const [i, courseId] of next.entries()) {
    const existing = kept.find((x) => x.courseId === courseId);
    const sortOrder = i < slots.length ? slots[i] : tail++;
    if (existing) {
      if (existing.action.sortOrder !== sortOrder) {
        await coachWrite(store, userId, existing.action, { sortOrder });
      }
    } else {
      const course = addable.find((c) => c.id === courseId);
      if (!course) continue;
      const tombstone = removed.find((x) => x.courseId === courseId);
      if (tombstone) {
        // Re-adding a removed course revives its row; the sync then sets its real status.
        await coachWrite(store, userId, tombstone.action, { status: newStatus, sortOrder });
        continue;
      }
      toCreate.push({
        courseId,
        title: learningActionTitle(course.title),
        description: 'Added to your learning path by your coach.',
        sortOrder,
        status: newStatus,
      });
    }
  }
  if (toCreate.length) await store.createLearningActions(userId, toCreate);
}

/** True when the action is a prescribed course (member cannot edit its status by hand). */
export function isLearningAction(goalId: string | null | undefined): boolean {
  return parseLearningGoalId(goalId) !== null;
}

// The site-wide publication rule: `status` is canonical; the legacy `isPublished` flag is not
// read (about 20 published courses still carry isPublished=false). Review r2 P1.
const PUBLISHED = lmsPublishedCourseWhere;

type LearningPathDb = Pick<
  typeof prisma,
  | 'carsiCoachingAssessment'
  | 'carsiCoachingAction'
  | 'lmsCourse'
  | 'lmsEnrollment'
  | 'lmsLesson'
  | 'lmsLessonProgress'
  | 'lmsLearningPathway'
>;

/**
 * The member lock is a row lock on the member's `lms_users` row (always present, and every
 * coaching row cascades from it) taken inside a transaction, so assignment and coach edits for
 * one member run one at a time. No schema change needed.
 */
async function withPrismaMemberLock<T>(
  userId: string,
  fn: (locked: LearningPathStore) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM lms_users WHERE id = ${userId}::uuid FOR UPDATE`;
    return fn(prismaStoreFor(tx));
  });
}

function prismaStoreFor(db: LearningPathDb): LearningPathStore {
  return {
    withMemberLock: withPrismaMemberLock,
    async latestSubmittedAssessmentJson(userId) {
      const row = await db.carsiCoachingAssessment.findFirst({
        where: { userId, submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' },
        select: { responsesJson: true },
      });
      return row?.responsesJson ?? null;
    },
    async listActions(userId) {
      return db.carsiCoachingAction.findMany({
        where: { userId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, goalId: true, status: true, sortOrder: true },
      });
    },
    async createLearningActions(userId, rows) {
      await db.carsiCoachingAction.createMany({
        data: rows.map((r) => ({
          userId,
          title: r.title,
          description: r.description,
          goalId: learningGoalId(r.courseId),
          status: r.status ?? 'todo',
          assignedTo: 'customer',
          sortOrder: r.sortOrder,
        })),
      });
    },
    async updateAction(userId, id, expectedStatus, data) {
      const res = await db.carsiCoachingAction.updateMany({
        where: { id, userId, status: expectedStatus },
        data: {
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          ...(data.status !== undefined
            ? { status: data.status, completedAt: data.status === 'done' ? new Date() : null }
            : {}),
        },
      });
      return res.count > 0;
    },
    async gapCourseMap() {
      return loadGapCourseMap(prismaGapMapStoreFor(db));
    },
    async publishedCoursesBySlugs(slugs) {
      if (slugs.length === 0) return [];
      return db.lmsCourse.findMany({
        where: { slug: { in: slugs }, ...PUBLISHED },
        select: { id: true, slug: true, title: true },
      });
    },
    async publishedCoursesByIds(ids) {
      if (ids.length === 0) return [];
      return db.lmsCourse.findMany({
        where: { id: { in: ids }, ...PUBLISHED },
        select: { id: true, slug: true, title: true },
      });
    },
    async completedCourseIds(userId) {
      const rows = await db.lmsEnrollment.findMany({
        where: { studentId: userId, completedAt: { not: null }, status: { not: 'revoked' } },
        select: { courseId: true },
      });
      return new Set(rows.map((r) => r.courseId));
    },
    async courseProgress(userId, courseIds) {
      const out = new Map<string, LearningCourseProgress>();
      if (courseIds.length === 0) return out;
      const [enrolments, lessons, done] = await Promise.all([
        db.lmsEnrollment.findMany({
          where: { studentId: userId, courseId: { in: courseIds }, status: { not: 'revoked' } },
          select: { courseId: true, completedAt: true },
        }),
        db.lmsLesson.findMany({
          where: { module: { courseId: { in: courseIds } } },
          select: { module: { select: { courseId: true } } },
        }),
        db.lmsLessonProgress.findMany({
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
}

export const prismaLearningPathStore: LearningPathStore = prismaStoreFor(prisma);

export type CoachingLearningMember = {
  userId: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: string;
  /** Draft courses waiting for the coach's approval (0 when nothing is waiting). */
  draftCount: number;
};

/** Coaching members the coach can review (every monthly coaching subscription row). */
export async function listCoachingLearningMembers(): Promise<CoachingLearningMember[]> {
  const [rows, drafts] = await Promise.all([
    prisma.carsiCoachingMonthlySubscription.findMany({
      orderBy: { createdAt: 'desc' },
      select: { userId: true, status: true, user: { select: { email: true, fullName: true } } },
    }),
    prisma.carsiCoachingAction.groupBy({
      by: ['userId'],
      where: { status: LEARNING_PROPOSED_STATUS, goalId: { startsWith: LEARNING_GOAL_PREFIX } },
      _count: { _all: true },
    }),
  ]);
  const draftsByUser = new Map(drafts.map((d) => [d.userId, d._count._all]));
  return rows.map((r) => ({
    userId: r.userId,
    email: r.user.email,
    fullName: r.user.fullName,
    subscriptionStatus: r.status,
    draftCount: draftsByUser.get(r.userId) ?? 0,
  }));
}

/**
 * Coach view of one member: the gaps behind the path, the path with progress (drafts flagged),
 * whether it is waiting for approval, and the courses the coach can add.
 */
export async function getCoachLearningPathView(userId: string) {
  const json = await prismaLearningPathStore.latestSubmittedAssessmentJson(userId);
  const gaps = json ? detectAssessmentGaps(parseAssessmentResponsesJson(json)) : [];
  const [path, options] = await Promise.all([
    coachLearningPath(userId),
    prisma.lmsCourse.findMany({
      where: PUBLISHED,
      orderBy: { title: 'asc' },
      select: { id: true, slug: true, title: true },
    }),
  ]);
  const pathStatus: 'none' | 'draft' | 'approved' =
    path.length === 0 ? 'none' : path.some((p) => p.draft) ? 'draft' : 'approved';
  return { hasAssessment: Boolean(json), gaps, path, pathStatus, options };
}

/** Paths are only written for people who have a coaching membership row. */
export async function isCoachingMember(userId: string): Promise<boolean> {
  const row = await prisma.carsiCoachingMonthlySubscription.findUnique({
    where: { userId },
    select: { id: true },
  });
  return row !== null;
}
