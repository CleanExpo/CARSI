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
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findFirst: mock.findFirst, findMany: mock.findMany },
    lmsPracticalAssessment: { findUnique: mock.assessmentFindUnique },
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
});
