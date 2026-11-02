import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS3 (P0-C) review fix — pin the practical-assessment allow-set gates against a
 * revert to the never-written `not: 'cancelled'` sentinel. Asserting the query
 * SHAPE is what catches such a revert (a revoked row must not pass).
 */
const mock = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  assessmentFindUnique: vi.fn(),
  assessmentFindMany: vi.fn(),
  courseFindMany: vi.fn(),
  courseFindUnique: vi.fn(),
  enrolFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findFirst: mock.findFirst, findMany: mock.findMany, findUnique: mock.enrolFindUnique },
    lmsPracticalAssessment: { findUnique: mock.assessmentFindUnique, findMany: mock.assessmentFindMany },
    lmsCourse: { findMany: mock.courseFindMany, findUnique: mock.courseFindUnique },
  },
}));

const { submitPracticalAssessment, listAvailableAssessmentsForStudent, AssessmentError } =
  await import('./practical-assessment');

const ALLOW_SET = { in: ['active', 'completed'] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('submitPracticalAssessment — allow-set enrolment gate', () => {
  it('queries the allow-set and 403s a learner with no active/completed enrolment', async () => {
    mock.assessmentFindUnique.mockResolvedValueOnce({ id: 'a1', isPublished: true, courseId: 'crs' });
    mock.findFirst.mockResolvedValueOnce(null); // no access-granting enrolment (e.g. revoked)

    await expect(
      submitPracticalAssessment({ studentId: 'stu', assessmentId: 'a1', evidenceText: 'x', evidenceUrls: [] }),
    ).rejects.toBeInstanceOf(AssessmentError);

    expect(mock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: ALLOW_SET }) }),
    );
  });
});

describe('listAvailableAssessmentsForStudent — allow-set enrolment gate', () => {
  it('queries the allow-set (a revoked enrolment is excluded)', async () => {
    mock.findMany.mockResolvedValueOnce([]);
    await listAvailableAssessmentsForStudent('stu');
    expect(mock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: ALLOW_SET }) }),
    );
  });

  it('leaves out a course still locked behind an unmet prerequisite (DECISIONS #41)', async () => {
    const L2 = 'level-2-mould-remediation-30ee3492';
    const mouldMeta = { prerequisites: [{ courseSlug: L2 }], prerequisitesEnforcedFrom: '2026-11-02T00:00:00+11:00' };
    mock.findMany.mockImplementation(async (args: { where: { status?: unknown } }) =>
      args.where.status === 'completed' ? [] : [{ courseId: 'c-plain' }, { courseId: 'c-mould' }],
    );
    mock.courseFindMany.mockImplementation(async (args: { where: { id?: unknown } }) =>
      args.where.id
        ? [{ id: 'c-plain', meta: null }, { id: 'c-mould', meta: mouldMeta }]
        : [{ id: 'c-l2', slug: L2, title: 'Level 2' }],
    );
    mock.courseFindUnique.mockResolvedValue({ slug: 'mould-remediation-fundamentals', meta: mouldMeta });
    mock.enrolFindUnique.mockResolvedValue({
      status: 'active', enrolledAt: new Date('2026-11-10T00:00:00Z'), paymentReference: 'free',
    });
    mock.assessmentFindMany.mockResolvedValue([]);

    await listAvailableAssessmentsForStudent('stu');
    expect(mock.assessmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ courseId: { in: ['c-plain'] } }) }),
    );

    mock.assessmentFindMany.mockClear();
    await listAvailableAssessmentsForStudent('stu', { isAdmin: () => true });
    expect(mock.assessmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ courseId: { in: ['c-plain', 'c-mould'] } }) }),
    );
  });
});
