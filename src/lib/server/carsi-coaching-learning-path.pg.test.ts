/**
 * GP-633 prescribed learning path on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store and proves:
 *   - a marketing-gap member gets the two marketing courses as learning actions on the board;
 *   - completing a course in the LMS flips its action to done on the member's board read;
 *   - the member cannot change a learning action's status or delete it, but can still delete an
 *     ordinary action (goal_id NULL — the NOT-LIKE-on-NULL trap);
 *   - the coach can remove, add and reorder, and another member's rows are never touched.
 * Cleans up after itself. Locally it is skipped without a local DATABASE_URL; in CI it must run.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { emptyAssessmentResponses } from '@/lib/coaching-portal/assessment-schema';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const IN_CI = process.env.CI === 'true';
const HOST = (() => {
  try {
    return DB_URL ? new URL(DB_URL).hostname : '';
  } catch {
    return '';
  }
})();
const RUNNABLE = Boolean(DB_URL) && ['localhost', '127.0.0.1', '::1'].includes(HOST);

if (!RUNNABLE) {
  describe('coaching learning path (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('coaching learning path (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const lp = await import('@/lib/server/carsi-coaching-learning-path');
  const store = await import('@/lib/server/carsi-coaching-actions-store');
  const { learningGoalId } = await import('@/lib/coaching-portal/learning-path');

  const memberId = randomUUID();
  const otherId = randomUUID();
  const instructorId = randomUUID();
  const createdCourseIds: string[] = [];
  const courseIdBySlug = new Map<string, string>();
  const extraSlug = `gp633-extra-${randomUUID().slice(0, 8)}`;

  async function ensureCourse(slug: string, title: string): Promise<string> {
    const existing = await prisma.lmsCourse.findUnique({ where: { slug } });
    if (existing) {
      if (existing.status !== 'published' || existing.isPublished !== true) {
        throw new Error(`fixture course ${slug} exists but is not published`);
      }
      return existing.id;
    }
    const id = randomUUID();
    await prisma.lmsCourse.create({
      data: {
        id,
        slug,
        title,
        instructorId,
        status: 'published',
        isPublished: true,
        priceAud: 0,
        modules: {
          create: [
            {
              id: randomUUID(),
              title: 'Module 1',
              orderIndex: 0,
              lessons: {
                create: [0, 1, 2, 3].map((i) => ({
                  id: randomUUID(),
                  title: `Lesson ${i + 1}`,
                  contentType: 'text',
                  orderIndex: i,
                })),
              },
            },
          ],
        },
      },
    });
    createdCourseIds.push(id);
    return id;
  }

  beforeAll(async () => {
    await prisma.lmsUser.createMany({
      data: [memberId, otherId, instructorId].map((id) => ({
        id,
        email: `gp633-${id}@example.test`,
        hashedPassword: 'provisional:x',
      })),
    });
    for (const [slug, title] of [
      ['social-media-marketing', 'Social Media Marketing'],
      ['introduction-to-water-damage-marketing-and-sales', 'Water Damage Marketing and Sales'],
      [extraSlug, 'GP-633 extra course'],
    ] as const) {
      courseIdBySlug.set(slug, await ensureCourse(slug, title));
    }
    for (const userId of [memberId, otherId]) {
      await prisma.carsiCoachingMonthlySubscription.create({
        data: { userId, status: 'active' },
      });
      await prisma.carsiCoachingAssessment.create({
        data: {
          userId,
          status: 'submitted',
          submittedAt: new Date(),
          responsesJson: JSON.stringify({
            ...emptyAssessmentResponses(),
            lead_sources: 'Word of mouth only',
            marketing_efforts: 'Nothing',
            top_priorities: 'More leads and a website',
            profitability: 'Modest profit',
          }),
        },
      });
    }
    await prisma.carsiCoachingAction.create({
      data: { userId: memberId, title: 'Call three past clients', sortOrder: 0 },
    });
  });

  afterAll(async () => {
    await prisma.lmsUser.deleteMany({ where: { id: { in: [memberId, otherId] } } });
    await prisma.lmsCourse.deleteMany({ where: { id: { in: createdCourseIds } } });
    await prisma.lmsUser.deleteMany({ where: { id: instructorId } });
    await prisma.$disconnect();
  });

  const social = () => courseIdBySlug.get('social-media-marketing')!;
  const wdMkt = () => courseIdBySlug.get('introduction-to-water-damage-marketing-and-sales')!;

  it('assigns the two marketing courses as learning actions after the business action', async () => {
    const res = await lp.assignLearningPathFromAssessment(memberId);
    expect(res.status).toBe('assigned');
    const rows = await prisma.carsiCoachingAction.findMany({
      where: { userId: memberId },
      orderBy: { sortOrder: 'asc' },
    });
    expect(rows.map((r) => r.goalId)).toEqual([
      null,
      learningGoalId(social()),
      learningGoalId(wdMkt()),
    ]);
    expect((await lp.assignLearningPathFromAssessment(memberId)).status).toBe('already_assigned');
    expect(await prisma.carsiCoachingAction.count({ where: { userId: otherId } })).toBe(0);
  });

  it('flips the action to done on the board when the LMS completes the course', async () => {
    await prisma.lmsEnrollment.create({
      data: {
        id: randomUUID(),
        studentId: memberId,
        courseId: social(),
        status: 'active',
        completedAt: new Date(),
      },
    });
    const items = await store.listCoachingActionsForUser(memberId);
    const learning = items.find((i) => i.goalId === learningGoalId(social()));
    expect(learning).toMatchObject({ status: 'done', learning: { percent: 100 } });
    const row = await prisma.carsiCoachingAction.findFirstOrThrow({
      where: { userId: memberId, goalId: learningGoalId(social()) },
    });
    expect(row.status).toBe('done');
    expect(row.completedAt).not.toBeNull();
  });

  it('member cannot change a learning action status or delete it, but can delete a normal action', async () => {
    const learningRow = await prisma.carsiCoachingAction.findFirstOrThrow({
      where: { userId: memberId, goalId: learningGoalId(wdMkt()) },
    });
    await store.upsertCoachingActionForUser(memberId, {
      id: learningRow.id,
      title: 'Renamed by member',
      status: 'done',
      progressNote: 'Halfway through module 1',
    });
    const after = await prisma.carsiCoachingAction.findUniqueOrThrow({
      where: { id: learningRow.id },
    });
    expect(after.status).toBe('todo');
    expect(after.title).toBe(learningRow.title);
    expect(after.progressNote).toBe('Halfway through module 1');

    expect(await store.deleteCoachingActionForUser(memberId, learningRow.id)).toBe(false);
    const normal = await prisma.carsiCoachingAction.findFirstOrThrow({
      where: { userId: memberId, goalId: null },
    });
    expect(await store.deleteCoachingActionForUser(memberId, normal.id)).toBe(true);
  });

  it('coach removes, adds and reorders the path', async () => {
    const extra = courseIdBySlug.get(extraSlug)!;
    const items = await lp.adjustLearningPath(memberId, {
      removeCourseIds: [social()],
      addCourseIds: [extra, randomUUID()],
      orderCourseIds: [extra, wdMkt()],
    });
    expect(items.map((i) => i.courseId)).toEqual([extra, wdMkt()]);
    const rows = await prisma.carsiCoachingAction.findMany({
      where: { userId: memberId },
      orderBy: { sortOrder: 'asc' },
    });
    expect(rows.filter((r) => r.status !== 'removed').map((r) => r.goalId)).toEqual([
      learningGoalId(extra),
      learningGoalId(wdMkt()),
    ]);
    // Removed course stays as a hidden tombstone so a later assign cannot re-prescribe it.
    expect(rows.find((r) => r.goalId === learningGoalId(social()))?.status).toBe('removed');
    const board = await store.listCoachingActionsForUser(memberId);
    expect(board.map((b) => b.goalId)).not.toContain(learningGoalId(social()));
    expect((await lp.assignLearningPathFromAssessment(memberId)).status).toBe('already_assigned');
  });

  it('two simultaneous assignments for one member write the path once (review r1 P1)', async () => {
    const results = await Promise.all([
      lp.assignLearningPathFromAssessment(otherId),
      lp.assignLearningPathFromAssessment(otherId),
      lp.assignLearningPathFromAssessment(otherId),
    ]);
    expect(results.filter((r) => r.status === 'assigned')).toHaveLength(1);
    const rows = await prisma.carsiCoachingAction.findMany({ where: { userId: otherId } });
    expect(rows.map((r) => r.goalId).sort()).toEqual(
      [learningGoalId(social()), learningGoalId(wdMkt())].sort()
    );
  });

  it('a write based on a stale status changes nothing (review r3 P1)', async () => {
    const row = await prisma.carsiCoachingAction.findFirstOrThrow({
      where: { userId: memberId, goalId: learningGoalId(social()) },
    });
    expect(row.status).toBe('removed');
    const wrote = await lp.prismaLearningPathStore.updateAction(memberId, row.id, 'todo', {
      status: 'done',
    });
    expect(wrote).toBe(false);
    const after = await prisma.carsiCoachingAction.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('removed');
  });

  it('two simultaneous coach adds of one course create one action', async () => {
    const extra = courseIdBySlug.get(extraSlug)!;
    await Promise.all([
      lp.adjustLearningPath(otherId, { addCourseIds: [extra] }),
      lp.adjustLearningPath(otherId, { addCourseIds: [extra] }),
    ]);
    expect(
      await prisma.carsiCoachingAction.count({
        where: { userId: otherId, goalId: learningGoalId(extra) },
      })
    ).toBe(1);
  });
});
