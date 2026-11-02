import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Server adapter for the prerequisite gate (DECISIONS #41): loads facts from Prisma and
 * shapes the refusal. The decision rules themselves are covered in
 * src/lib/lms/course-prerequisites.test.ts.
 */
const mocks = vi.hoisted(() => ({
  courseFindMany: vi.fn(),
  courseFindUnique: vi.fn(),
  enrolFindMany: vi.fn(),
  enrolFindUnique: vi.fn(),
  quizFindUnique: vi.fn(),
  lessonFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: { findMany: mocks.courseFindMany, findUnique: mocks.courseFindUnique },
    lmsEnrollment: { findMany: mocks.enrolFindMany, findUnique: mocks.enrolFindUnique },
    lmsQuiz: { findUnique: mocks.quizFindUnique },
    lmsLesson: { findUnique: mocks.lessonFindUnique },
  },
}));

const {
  findCoursePrerequisiteBlock,
  findEnrolledCoursePrerequisiteBlock,
  findQuizPrerequisiteBlock,
  findLessonPrerequisiteBlock,
  filterCoursesPassingPrerequisites,
  listCoursePrerequisiteLinks,
} = await import('./course-prerequisites');

const L2 = 'level-2-mould-remediation-30ee3492';
const MOULD = {
  slug: 'mould-remediation-fundamentals',
  meta: { prerequisites: [{ courseSlug: L2 }], prerequisitesEnforcedFrom: '2026-11-02T00:00:00+11:00' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.courseFindMany.mockResolvedValue([{ id: 'c-l2', slug: L2, title: 'Level 2 — Mould Remediation' }]);
  mocks.enrolFindMany.mockResolvedValue([]);
});

describe('findCoursePrerequisiteBlock', () => {
  it('a course with no prerequisites costs no queries', async () => {
    const block = await findCoursePrerequisiteBlock({
      userId: 'u',
      isAdmin: () => {
        throw new Error('admin flag must not be resolved for a course without prerequisites');
      },
      course: { slug: 'water-damage-essentials', meta: { designation: 'x' } },
    });
    expect(block).toBeNull();
    expect(mocks.courseFindMany).not.toHaveBeenCalled();
  });

  it('blocks a learner who has not completed the prerequisite, with title + link', async () => {
    const block = await findCoursePrerequisiteBlock({ userId: 'u', isAdmin: false, course: MOULD });
    expect(block).toEqual({
      code: 'prerequisite_not_met',
      detail:
        'Complete Level 2 — Mould Remediation first. This course is locked until you have completed its prerequisite.',
      prerequisites: [
        { slug: L2, title: 'Level 2 — Mould Remediation', href: `/courses/${L2}` },
      ],
    });
    expect(mocks.enrolFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'u', status: 'completed' }),
      }),
    );
  });

  it('allows a learner with a completed prerequisite enrolment', async () => {
    mocks.enrolFindMany.mockResolvedValue([{ courseId: 'c-l2' }]);
    expect(await findCoursePrerequisiteBlock({ userId: 'u', isAdmin: false, course: MOULD })).toBeNull();
  });

  it('admin bypasses without any lookup', async () => {
    expect(await findCoursePrerequisiteBlock({ userId: 'u', isAdmin: () => true, course: MOULD })).toBeNull();
    expect(mocks.courseFindMany).not.toHaveBeenCalled();
  });

  it('grandfathered enrolment is allowed without loading facts', async () => {
    const block = await findCoursePrerequisiteBlock({
      userId: 'u',
      isAdmin: false,
      course: MOULD,
      enrolment: { status: 'active', enrolledAt: new Date('2026-10-01T00:00:00Z'), paymentReference: 'cs_x' },
    });
    expect(block).toBeNull();
    expect(mocks.courseFindMany).not.toHaveBeenCalled();
  });

  it('unknown prerequisite slug fails closed with a logged warning and no course link', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.courseFindMany.mockResolvedValue([]);
    const block = await findCoursePrerequisiteBlock({ userId: 'u', isAdmin: false, course: MOULD });
    expect(block?.code).toBe('prerequisite_not_met');
    expect(block?.prerequisites).toEqual([]);
    expect(block?.detail).toMatch(/contact CARSI support/);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failing closed'),
      expect.objectContaining({ reason: 'unknown-prerequisite', unknown: [L2] }),
    );
    warn.mockRestore();
  });
});

describe('read-time helpers', () => {
  it('findEnrolledCoursePrerequisiteBlock stops after one query when the course has none', async () => {
    mocks.courseFindUnique.mockResolvedValue({ slug: 'x', meta: null });
    expect(await findEnrolledCoursePrerequisiteBlock({ userId: 'u', isAdmin: false, courseId: 'c' })).toBeNull();
    expect(mocks.enrolFindUnique).not.toHaveBeenCalled();
  });

  it('findEnrolledCoursePrerequisiteBlock blocks a post-gate enrolment without the prerequisite', async () => {
    mocks.courseFindUnique.mockResolvedValue(MOULD);
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active',
      enrolledAt: new Date('2026-11-10T00:00:00Z'),
      paymentReference: 'free',
    });
    const block = await findEnrolledCoursePrerequisiteBlock({ userId: 'u', isAdmin: false, courseId: 'c' });
    expect(block?.prerequisites[0]?.slug).toBe(L2);
  });

  it('findQuizPrerequisiteBlock resolves the quiz course', async () => {
    mocks.quizFindUnique.mockResolvedValue({ courseId: 'c' });
    mocks.courseFindUnique.mockResolvedValue(MOULD);
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active',
      enrolledAt: new Date('2026-10-01T00:00:00Z'),
      paymentReference: 'cs_old',
    });
    expect(await findQuizPrerequisiteBlock({ userId: 'u', isAdmin: false, quizId: 'q' })).toBeNull();
  });

  it('listCoursePrerequisiteLinks returns titles, and nothing (no query) when there are none', async () => {
    expect(await listCoursePrerequisiteLinks(MOULD.meta)).toEqual([
      { slug: L2, title: 'Level 2 — Mould Remediation' },
    ]);
    mocks.courseFindMany.mockClear();
    expect(await listCoursePrerequisiteLinks({})).toEqual([]);
    expect(mocks.courseFindMany).not.toHaveBeenCalled();
  });

  it('findLessonPrerequisiteBlock resolves the lesson course and blocks a post-gate enrolment', async () => {
    mocks.lessonFindUnique.mockResolvedValue({ module: { courseId: 'c' } });
    mocks.courseFindUnique.mockResolvedValue(MOULD);
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active',
      enrolledAt: new Date('2026-11-10T00:00:00Z'),
      paymentReference: 'free',
    });
    const block = await findLessonPrerequisiteBlock({ userId: 'u', isAdmin: false, lessonId: 'l' });
    expect(block?.code).toBe('prerequisite_not_met');
    expect(mocks.courseFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c' } }));
  });

  it('findLessonPrerequisiteBlock returns null for an unknown lesson (caller 404s)', async () => {
    mocks.lessonFindUnique.mockResolvedValue(null);
    expect(await findLessonPrerequisiteBlock({ userId: 'u', isAdmin: false, lessonId: 'l' })).toBeNull();
    expect(mocks.courseFindUnique).not.toHaveBeenCalled();
  });
});

describe('filterCoursesPassingPrerequisites', () => {
  it('keeps courses without prerequisites and drops a locked one', async () => {
    mocks.courseFindMany.mockImplementation(async (args: { where: { id?: unknown } }) =>
      args.where.id
        ? [
            { id: 'c-free', meta: null },
            { id: 'c-mould', meta: MOULD.meta },
          ]
        : [{ id: 'c-l2', slug: L2, title: 'Level 2 — Mould Remediation' }],
    );
    mocks.courseFindUnique.mockResolvedValue(MOULD);
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active',
      enrolledAt: new Date('2026-11-10T00:00:00Z'),
      paymentReference: 'free',
    });
    const allowed = await filterCoursesPassingPrerequisites({
      userId: 'u',
      isAdmin: false,
      courseIds: ['c-free', 'c-mould'],
    });
    expect([...allowed]).toEqual(['c-free']);
  });

  it('an admin keeps every course; an empty list costs no query', async () => {
    mocks.courseFindMany.mockResolvedValue([{ id: 'c-mould', meta: MOULD.meta }]);
    mocks.courseFindUnique.mockResolvedValue(MOULD);
    const allowed = await filterCoursesPassingPrerequisites({ userId: 'u', isAdmin: true, courseIds: ['c-mould'] });
    expect([...allowed]).toEqual(['c-mould']);
    mocks.courseFindMany.mockClear();
    expect((await filterCoursesPassingPrerequisites({ userId: 'u', isAdmin: false, courseIds: [] })).size).toBe(0);
    expect(mocks.courseFindMany).not.toHaveBeenCalled();
  });
});
