/**
 * GP-633 prescribed learning path on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store and proves:
 *   - a marketing-gap member gets the two marketing courses as learning actions on the board;
 *   - completing a course in the LMS flips its action to done on the member's board read;
 *   - the member cannot change a learning action's status or delete it, but can still delete an
 *     ordinary action (goal_id NULL — the NOT-LIKE-on-NULL trap);
 *   - the coach can remove, add and reorder, and another member's rows are never touched;
 *   - an assigned path is a draft the member cannot see or edit until the coach approves it;
 *   - the coach's gap-map edit is stored as an UNPUBLISHED pathway that no public pathway read
 *     returns (with a published control pathway proving the read sees data), and assignment
 *     uses it.
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
  const { learningGoalId, GAP_MAP_SLUG_PREFIX } =
    await import('@/lib/coaching-portal/learning-path');
  const gapMap = await import('@/lib/server/carsi-coaching-gap-map');
  const { DEFAULT_COACHING_CHAPTER_SLUG } = await import('@/lib/coaching-portal/coach-routing');

  const memberId = randomUUID();
  const otherId = randomUUID();
  const mapMemberId = randomUUID();
  const controlPathwayId = randomUUID();
  // Coach map edits already in this database. They are set aside for the run (the tests assume
  // the built-in map) and put back exactly afterwards; only rows this suite creates are deleted.
  type SavedPathway = Awaited<
    ReturnType<typeof prisma.lmsLearningPathway.findMany<{ include: { courses: true } }>>
  >[number];
  let setAside: SavedPathway[] = [];
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
    setAside = await prisma.lmsLearningPathway.findMany({
      where: { slug: { startsWith: GAP_MAP_SLUG_PREFIX } },
      include: { courses: true },
    });
    await prisma.lmsLearningPathway.deleteMany({
      where: { id: { in: setAside.map((p) => p.id) } },
    });
    await prisma.lmsUser.createMany({
      data: [memberId, otherId, mapMemberId, instructorId].map((id) => ({
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
    for (const userId of [memberId, otherId, mapMemberId]) {
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
    // Only rows this suite created: its own map edits (none of the set-aside ids) and the control.
    await prisma.lmsLearningPathway.deleteMany({
      where: {
        OR: [
          {
            slug: { startsWith: GAP_MAP_SLUG_PREFIX },
            id: { notIn: setAside.map((p) => p.id) },
          },
          { id: controlPathwayId },
        ],
      },
    });
    for (const { courses, ...pathway } of setAside) {
      await prisma.lmsLearningPathway.create({
        data: {
          ...pathway,
          courses: {
            create: courses.map((c) => ({ courseId: c.courseId, orderIndex: c.orderIndex })),
          },
        },
      });
    }
    await prisma.lmsUser.deleteMany({ where: { id: { in: [memberId, otherId, mapMemberId] } } });
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

  it('the assigned path is a draft: hidden from the member board until the coach approves', async () => {
    const drafts = await prisma.carsiCoachingAction.findMany({
      where: { userId: memberId, goalId: { startsWith: 'course:' } },
    });
    expect(drafts.map((d) => d.status)).toEqual(['proposed', 'proposed']);
    const board = await store.listCoachingActionsForUser(memberId);
    expect(board.map((b) => b.goalId)).toEqual([null]);

    // The member cannot touch a draft they cannot see, nor re-create it under its id.
    await store.upsertCoachingActionForUser(memberId, {
      id: drafts[0].id,
      title: 'Member edit',
      status: 'done',
      progressNote: 'sneaky',
    });
    const untouched = await prisma.carsiCoachingAction.findUniqueOrThrow({
      where: { id: drafts[0].id },
    });
    expect(untouched).toMatchObject({ status: 'proposed', progressNote: null });

    const members = await lp.listCoachingLearningMembers();
    expect(members.find((m) => m.userId === memberId)?.draftCount).toBe(2);
    const view = await lp.getCoachLearningPathView(memberId);
    expect(view.pathStatus).toBe('draft');
    expect(view.path.every((p) => p.draft)).toBe(true);

    const res = await lp.approveLearningPath(memberId);
    expect(res.approved).toBe(2);
    const live = await store.listCoachingActionsForUser(memberId);
    expect(live.map((b) => b.goalId)).toEqual([
      null,
      learningGoalId(social()),
      learningGoalId(wdMkt()),
    ]);
    expect((await lp.getCoachLearningPathView(memberId)).pathStatus).toBe('approved');
    expect(
      (await lp.listCoachingLearningMembers()).find((m) => m.userId === memberId)?.draftCount
    ).toBe(0);
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

  it('a coach gap-map edit is an unpublished pathway no public read returns, and assignment uses it', async () => {
    const extra = courseIdBySlug.get(extraSlug)!;
    // Positive control: a published pathway the public reads DO return.
    await prisma.lmsLearningPathway.create({
      data: {
        id: controlPathwayId,
        slug: `gp633-control-${controlPathwayId.slice(0, 8)}`,
        title: 'GP-633 control pathway',
        isPublished: true,
        courses: { create: [{ courseId: extra, orderIndex: 0 }] },
      },
    });
    await gapMap.saveGapMapEntry({
      chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
      area: 'marketing',
      courseIds: [extra],
    });
    const marketingSlug = `${GAP_MAP_SLUG_PREFIX}${DEFAULT_COACHING_CHAPTER_SLUG}--marketing`;
    const row = await prisma.lmsLearningPathway.findUniqueOrThrow({
      where: { slug: marketingSlug },
      include: { courses: true },
    });
    expect(row).toMatchObject({ isPublished: false, iicrcDiscipline: null });
    expect(row.courses.map((c) => c.courseId)).toEqual([extra]);

    const { GET } = await import('../../../app/api/lms/pathways/route');
    const publicSlugs = ((await (await GET()).json()) as { items: { slug: string }[] }).items.map(
      (i) => i.slug
    );
    expect(publicSlugs).toContain(`gp633-control-${controlPathwayId.slice(0, 8)}`);
    expect(publicSlugs.some((s) => s.startsWith(GAP_MAP_SLUG_PREFIX))).toBe(false);
    const { getPathwayProgressForStudent } = await import('@/lib/server/pathway-progress');
    const progressIds = (await getPathwayProgressForStudent(memberId)).map((p) => p.pathway_id);
    expect(progressIds).toContain(controlPathwayId);
    expect(progressIds).not.toContain(row.id);

    expect((await lp.assignLearningPathFromAssessment(mapMemberId)).status).toBe('assigned');
    const mapped = await prisma.carsiCoachingAction.findMany({ where: { userId: mapMemberId } });
    expect(mapped.map((m) => m.goalId)).toEqual([learningGoalId(extra)]);

    await gapMap.resetGapMapEntry({
      chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
      area: 'marketing',
    });
    expect(await prisma.lmsLearningPathway.count({ where: { slug: marketingSlug } })).toBe(0);
  });

  it('treats status as the publication flag: a legacy isPublished=false course is pickable, a draft is not (review r2 P1)', async () => {
    const legacyId = randomUUID();
    const draftId = randomUUID();
    for (const [id, status, isPublished] of [
      [legacyId, 'published', false],
      [draftId, 'draft', true],
    ] as const) {
      await prisma.lmsCourse.create({
        data: {
          id,
          slug: `gp633-${status}-${id.slice(0, 8)}`,
          title: `GP-633 ${status} course`,
          instructorId,
          status,
          isPublished,
          priceAud: 0,
        },
      });
      createdCourseIds.push(id);
    }

    const pickable = (await gapMap.prismaGapMapStore.publishedCatalogue()).map((c) => c.id);
    expect(pickable).toContain(legacyId);
    expect(pickable).not.toContain(draftId);
    await gapMap.saveGapMapEntry({
      chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
      area: 'sales',
      courseIds: [legacyId],
    });
    await expect(
      gapMap.saveGapMapEntry({
        chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
        area: 'sales',
        courseIds: [draftId],
      })
    ).rejects.toBeInstanceOf(gapMap.GapMapValidationError);
    await gapMap.resetGapMapEntry({ chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG, area: 'sales' });

    // The coach's per-member path picker and add use the same rule.
    const view = await lp.getCoachLearningPathView(mapMemberId);
    expect(view.options.map((o) => o.id)).toContain(legacyId);
    expect(view.options.map((o) => o.id)).not.toContain(draftId);
    const path = await lp.adjustLearningPath(mapMemberId, { addCourseIds: [legacyId, draftId] });
    expect(path.map((p) => p.courseId)).toContain(legacyId);
    expect(path.map((p) => p.courseId)).not.toContain(draftId);
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
