import { describe, expect, it } from 'vitest';

import { emptyAssessmentResponses } from '@/lib/coaching-portal/assessment-schema';
import {
  learningGoalId,
  type LearningCatalogueCourse,
  type LearningCourseProgress,
} from '@/lib/coaching-portal/learning-path';
import {
  adjustLearningPath,
  assignLearningPathFromAssessment,
  syncLearningPath,
  type LearningActionRecord,
  type LearningPathStore,
} from '@/lib/server/carsi-coaching-learning-path';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const C_SOCIAL = 'aaaaaaaa-0000-4000-8000-000000000001';
const C_WD_MKT = 'aaaaaaaa-0000-4000-8000-000000000002';
const C_ESTIMATING = 'aaaaaaaa-0000-4000-8000-000000000003';
const C_ADMIN = 'aaaaaaaa-0000-4000-8000-000000000004';

const CATALOGUE: LearningCatalogueCourse[] = [
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

const MARKETING_GAP_ASSESSMENT = JSON.stringify({
  ...emptyAssessmentResponses(),
  lead_sources: 'Word of mouth only',
  marketing_efforts: 'None',
  top_priorities: 'More leads and a proper website',
  profitability: 'Modest profit',
});

type Action = LearningActionRecord & { userId: string };

/** In-memory store. Records every write so tests can prove other members are never touched. */
function fakeStore(opts: {
  assessmentJson?: string | null;
  actions?: Action[];
  progress?: Record<string, LearningCourseProgress>;
  catalogue?: LearningCatalogueCourse[];
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
          status: 'todo',
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

describe('assignLearningPathFromAssessment', () => {
  it('assigns the two marketing modules to a marketing-gap member as board actions', async () => {
    const { store, actions } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      actions: [
        {
          id: 'biz-1',
          userId: USER,
          title: 'Call three past clients',
          goalId: null,
          status: 'todo',
          sortOrder: 0,
        },
      ],
    });
    const res = await assignLearningPathFromAssessment(USER, store);
    expect(res.status).toBe('assigned');
    const learning = actions.filter((a) => a.goalId?.startsWith('course:'));
    expect(learning.map((a) => a.goalId)).toEqual([
      learningGoalId(C_SOCIAL),
      learningGoalId(C_WD_MKT),
    ]);
    // Learning actions land after the member's existing business actions.
    expect(Math.min(...learning.map((a) => a.sortOrder))).toBeGreaterThan(0);
  });

  it('skips an already completed course', async () => {
    const { store, actions } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: true, lessonsTotal: 5, lessonsCompleted: 5 },
      },
    });
    await assignLearningPathFromAssessment(USER, store);
    expect(actions.map((a) => a.goalId)).not.toContain(learningGoalId(C_SOCIAL));
    expect(actions.map((a) => a.goalId)).toContain(learningGoalId(C_WD_MKT));
  });

  it('is idempotent: a second run does not duplicate or re-add a path the coach already shaped', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    const before = actions.length;
    const again = await assignLearningPathFromAssessment(USER, store);
    expect(again.status).toBe('already_assigned');
    expect(actions.length).toBe(before);
  });

  it('writes nothing without a submitted assessment', async () => {
    const { store, writes } = fakeStore({ assessmentJson: null });
    expect((await assignLearningPathFromAssessment(USER, store)).status).toBe('no_assessment');
    expect(writes).toEqual([]);
  });
});

describe('syncLearningPath (progress rollup on the action board)', () => {
  it('flips the linked action to done when the LMS completes the course, and only for this member', async () => {
    const { store, actions, writes } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'Complete: Social',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
        {
          id: 'l2',
          userId: USER,
          title: 'Complete: WD',
          goalId: learningGoalId(C_WD_MKT),
          status: 'todo',
          sortOrder: 2,
        },
        {
          id: 'o1',
          userId: OTHER_USER,
          title: 'Complete: Social',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
      ],
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: true, lessonsTotal: 5, lessonsCompleted: 5 },
        [C_WD_MKT]: { enrolled: true, completed: false, lessonsTotal: 4, lessonsCompleted: 1 },
      },
    });
    const items = await syncLearningPath(USER, store);
    expect(items.map((i) => [i.slug, i.status, i.percent])).toEqual([
      ['social-media-marketing', 'done', 100],
      ['introduction-to-water-damage-marketing-and-sales', 'in_progress', 25],
    ]);
    expect(actions.find((a) => a.id === 'l1')?.status).toBe('done');
    expect(actions.find((a) => a.id === 'l2')?.status).toBe('in_progress');
    expect(actions.find((a) => a.id === 'o1')?.status).toBe('todo');
    expect(writes.every((w) => w.includes(USER))).toBe(true);
  });

  it('does not write when nothing changed', async () => {
    const { store, writes } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
      ],
    });
    await syncLearningPath(USER, store);
    expect(writes).toEqual([]);
  });

  it('keeps a coach-set blocked status until the course is actually complete', async () => {
    const { store, actions } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'blocked',
          sortOrder: 1,
        },
      ],
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: false, lessonsTotal: 5, lessonsCompleted: 2 },
      },
    });
    await syncLearningPath(USER, store);
    expect(actions[0].status).toBe('blocked');
  });

  it('ignores ordinary business actions', async () => {
    const { store } = fakeStore({
      actions: [
        {
          id: 'biz',
          userId: USER,
          title: 'Call clients',
          goalId: null,
          status: 'todo',
          sortOrder: 0,
        },
      ],
    });
    expect(await syncLearningPath(USER, store)).toEqual([]);
  });
});

describe('adjustLearningPath (coach review)', () => {
  function seeded() {
    return fakeStore({
      actions: [
        {
          id: 'biz',
          userId: USER,
          title: 'Call clients',
          goalId: null,
          status: 'todo',
          sortOrder: 0,
        },
        {
          id: 'l1',
          userId: USER,
          title: 'Social',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
        {
          id: 'l2',
          userId: USER,
          title: 'WD',
          goalId: learningGoalId(C_WD_MKT),
          status: 'todo',
          sortOrder: 2,
        },
      ],
    });
  }

  it('removes a module, adds a published one, and reorders, leaving business actions alone', async () => {
    const { store, actions } = seeded();
    const items = await adjustLearningPath(
      USER,
      {
        removeCourseIds: [C_SOCIAL],
        addCourseIds: [C_ADMIN],
        orderCourseIds: [C_ADMIN, C_WD_MKT],
      },
      store
    );
    expect(items.map((i) => i.courseId)).toEqual([C_ADMIN, C_WD_MKT]);
    expect(actions.find((a) => a.id === 'biz')).toMatchObject({ status: 'todo', sortOrder: 0 });
    // Kept as a tombstone so the coach's decision is durable (review r2 P1).
    expect(actions.find((a) => a.goalId === learningGoalId(C_SOCIAL))?.status).toBe('removed');
  });

  it('refuses to add a course that is not in the published catalogue', async () => {
    const { store } = seeded();
    const items = await adjustLearningPath(
      USER,
      {
        addCourseIds: ['bbbbbbbb-0000-4000-8000-00000000dead'],
      },
      store
    );
    expect(items.map((i) => i.courseId)).toEqual([C_SOCIAL, C_WD_MKT]);
  });

  it('does not add a duplicate of a module already on the path', async () => {
    const { store } = seeded();
    const items = await adjustLearningPath(USER, { addCourseIds: [C_SOCIAL] }, store);
    expect(items.map((i) => i.courseId)).toEqual([C_SOCIAL, C_WD_MKT]);
  });
});

describe('concurrency (review r1 P1: concurrent assignment duplicated courses)', () => {
  it('two simultaneous assignments write the path once', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    const results = await Promise.all([
      assignLearningPathFromAssessment(USER, store),
      assignLearningPathFromAssessment(USER, store),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['already_assigned', 'assigned']);
    const goals = actions.map((a) => a.goalId);
    expect(goals).toEqual([learningGoalId(C_SOCIAL), learningGoalId(C_WD_MKT)]);
  });

  it('two simultaneous coach adds of the same course create one action', async () => {
    const { store, actions } = fakeStore({});
    await Promise.all([
      adjustLearningPath(USER, { addCourseIds: [C_ADMIN] }, store),
      adjustLearningPath(USER, { addCourseIds: [C_ADMIN] }, store),
    ]);
    expect(actions.filter((a) => a.goalId === learningGoalId(C_ADMIN))).toHaveLength(1);
  });
});

describe('enrolment on the path item', () => {
  it('reports whether the member is enrolled so the board can link correctly', async () => {
    const { store } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
        {
          id: 'l2',
          userId: USER,
          title: 'y',
          goalId: learningGoalId(C_WD_MKT),
          status: 'todo',
          sortOrder: 2,
        },
      ],
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: false, lessonsTotal: 4, lessonsCompleted: 0 },
      },
    });
    const items = await syncLearningPath(USER, store);
    expect(items.map((i) => i.enrolled)).toEqual([true, false]);
  });
});

describe('coach clears the path (review r2 P1: a full clear must stay cleared)', () => {
  it('a later assignment does not recreate a path the coach removed entirely', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    const cleared = await adjustLearningPath(
      USER,
      { removeCourseIds: [C_SOCIAL, C_WD_MKT] },
      store
    );
    expect(cleared).toEqual([]);
    const again = await assignLearningPathFromAssessment(USER, store);
    expect(again.status).toBe('already_assigned');
    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.status === 'removed')).toBe(true);
  });

  it('removed courses are not on the path and the sync never revives them', async () => {
    const { store, actions } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'removed',
          sortOrder: 1,
        },
      ],
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: true, lessonsTotal: 5, lessonsCompleted: 5 },
      },
    });
    expect(await syncLearningPath(USER, store)).toEqual([]);
    expect(actions[0].status).toBe('removed');
  });

  it('re-adding a removed course revives the same row instead of creating a duplicate', async () => {
    const { store, actions } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'removed',
          sortOrder: 1,
        },
      ],
    });
    const items = await adjustLearningPath(USER, { addCourseIds: [C_SOCIAL] }, store);
    expect(items.map((i) => i.actionId)).toEqual(['l1']);
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe('todo');
  });
});

describe('member read racing a coach removal (review r3 P1)', () => {
  it('a progress sync that started before the removal cannot revive the removed course', async () => {
    const { store, actions } = fakeStore({
      actions: [
        {
          id: 'l1',
          userId: USER,
          title: 'x',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 1,
        },
      ],
      progress: {
        [C_SOCIAL]: { enrolled: true, completed: true, lessonsTotal: 5, lessonsCompleted: 5 },
      },
    });
    // Pause the member's sync after it has read the rows, while the coach removes the course.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let paused!: () => void;
    const reachedProgress = new Promise<void>((r) => (paused = r));
    const slowStore: LearningPathStore = {
      ...store,
      async courseProgress(userId, ids) {
        paused();
        await gate;
        return store.courseProgress(userId, ids);
      },
    };
    const memberRead = syncLearningPath(USER, slowStore);
    await reachedProgress;
    await adjustLearningPath(USER, { removeCourseIds: [C_SOCIAL] }, store);
    expect(actions[0].status).toBe('removed');
    release();
    await memberRead;
    expect(actions[0].status).toBe('removed');
  });
});
