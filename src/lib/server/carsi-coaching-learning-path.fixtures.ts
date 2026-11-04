/**
 * Shared in-memory LearningPathStore for the GP-633 learning-path unit tests. Not a test file
 * itself (no `.test.` in the name), so vitest only runs it through the suites that import it.
 */
import { emptyAssessmentResponses } from '@/lib/coaching-portal/assessment-schema';
import {
  DEFAULT_GAP_COURSE_MAP,
  learningGoalId,
  type GapCourseMap,
  type LearningCatalogueCourse,
  type LearningCourseProgress,
} from '@/lib/coaching-portal/learning-path';
import type {
  LearningActionRecord,
  LearningPathStore,
} from '@/lib/server/carsi-coaching-learning-path';

export const USER = '11111111-1111-4111-8111-111111111111';
export const OTHER_USER = '22222222-2222-4222-8222-222222222222';
export const C_SOCIAL = 'aaaaaaaa-0000-4000-8000-000000000001';
export const C_WD_MKT = 'aaaaaaaa-0000-4000-8000-000000000002';
export const C_ESTIMATING = 'aaaaaaaa-0000-4000-8000-000000000003';
export const C_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000004';

export const CATALOGUE: LearningCatalogueCourse[] = [
  { id: C_SOCIAL, slug: 'social-media-marketing', title: 'Social Media Marketing' },
  {
    id: C_WD_MKT,
    slug: 'introduction-to-water-damage-marketing-and-sales',
    title: 'Introduction to Water Damage Marketing and Sales',
  },
  {
    id: C_ESTIMATING,
    slug: 'introduction-to-water-damage-estimating',
    title: 'Introduction to Water Damage Estimating',
  },
  { id: C_ADMIN, slug: 'admin-sole-trader', title: 'Admin for Sole Traders' },
];

export const MARKETING_GAP_ASSESSMENT = JSON.stringify({
  ...emptyAssessmentResponses(),
  lead_sources: 'Word of mouth only',
  marketing_efforts: 'None',
  top_priorities: 'More leads and a proper website',
  profitability: 'Modest profit',
});

export type Action = LearningActionRecord & { userId: string };

/** In-memory store. Records every write so tests can prove other members are never touched. */
export function fakeStore(opts: {
  assessmentJson?: string | null;
  actions?: Action[];
  progress?: Record<string, LearningCourseProgress>;
  catalogue?: LearningCatalogueCourse[];
  gapCourseMap?: GapCourseMap;
}) {
  const actions: Action[] = [...(opts.actions ?? [])];
  const catalogue = opts.catalogue ?? CATALOGUE;
  const progress = opts.progress ?? {};
  const writes: string[] = [];
  let nextId = 1;
  // Per-member mutex standing in for the row lock the Prisma store takes in a transaction.
  const locks = new Map<string, Promise<unknown>>();

  const store: LearningPathStore = {
    async withMemberLock(userId, fn) {
      const prev = locks.get(userId) ?? Promise.resolve();
      const run = prev.then(() => fn(store));
      locks.set(
        userId,
        run.catch(() => undefined)
      );
      return run;
    },
    async latestSubmittedAssessmentJson(userId) {
      return userId === USER ? (opts.assessmentJson ?? null) : null;
    },
    async listActions(userId) {
      return actions
        .filter((a) => a.userId === userId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ userId: _u, ...rest }) => ({ ...rest }));
    },
    async createLearningActions(userId, rows) {
      for (const r of rows) {
        writes.push(`create:${userId}:${r.courseId}`);
        actions.push({
          id: `new-${nextId++}`,
          userId,
          title: r.title,
          goalId: learningGoalId(r.courseId),
          status: r.status ?? 'todo',
          sortOrder: r.sortOrder,
        });
      }
    },
    async updateAction(userId, id, expectedStatus, data) {
      const row = actions.find((a) => a.id === id && a.userId === userId);
      if (!row) throw new Error(`update of foreign or missing action ${id}`);
      if (row.status !== expectedStatus) return false;
      writes.push(`update:${userId}:${id}:${JSON.stringify(data)}`);
      if (data.status !== undefined) row.status = data.status;
      if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;
      return true;
    },
    async gapCourseMap() {
      return opts.gapCourseMap ?? DEFAULT_GAP_COURSE_MAP;
    },
    async publishedCoursesBySlugs(slugs) {
      return catalogue.filter((c) => slugs.includes(c.slug));
    },
    async publishedCoursesByIds(ids) {
      return catalogue.filter((c) => ids.includes(c.id));
    },
    async completedCourseIds() {
      return new Set(
        Object.entries(progress)
          .filter(([, p]) => p.completed)
          .map(([id]) => id)
      );
    },
    async courseProgress(_userId, courseIds) {
      const out = new Map<string, LearningCourseProgress>();
      for (const id of courseIds) {
        out.set(
          id,
          progress[id] ?? {
            enrolled: false,
            completed: false,
            lessonsTotal: 5,
            lessonsCompleted: 0,
          }
        );
      }
      return out;
    },
  };
  return { store, actions, writes };
}
