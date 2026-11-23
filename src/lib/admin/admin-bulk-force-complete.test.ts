import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findEnrollments: vi.fn(),
  forceComplete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.findUser },
    lmsEnrollment: { findMany: mocks.findEnrollments },
  },
}));
vi.mock('@/lib/server/enrollment-service', () => ({
  forceCompleteEnrollment: mocks.forceComplete,
}));
vi.mock('@/lib/admin/admin-course-materialize', () => ({
  getOrCreateLmsCourseFromWorkbookCatalog: vi.fn(),
}));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  courseWithCurriculum: {},
  getOrCreateCourseBySlug: vi.fn(),
}));
vi.mock('@/lib/lms-seed-catalog', () => ({ getAllSeedSlugs: () => [] }));

import {
  AdminBulkCompletePartialError,
  adminMarkEnrollmentsComplete,
} from './admin-enrollment-mutations';

describe('adminMarkEnrollmentsComplete partial failure (GP-769)', () => {
  beforeEach(() => {
    mocks.findUser.mockReset().mockResolvedValue({ id: 'learner' });
    mocks.findEnrollments.mockReset().mockResolvedValue([{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }]);
    mocks.forceComplete.mockReset();
  });

  it('reports which rows were completed, which failed and which were not attempted', async () => {
    mocks.forceComplete
      .mockResolvedValueOnce({ lessonsMarked: 4, completed: true })
      .mockRejectedValueOnce(new Error('ENROLLMENT_NOT_FOUND'));

    const err = await adminMarkEnrollmentsComplete({
      studentId: 'learner',
      enrollmentIds: ['e1', 'e2', 'e3'],
      session: null,
      reason: 'support ticket',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AdminBulkCompletePartialError);
    const partial = err as AdminBulkCompletePartialError;
    expect(partial.completed).toEqual([{ enrollmentId: 'e1', lessonsMarked: 4, completed: true }]);
    expect(partial.failed).toEqual({ enrollmentId: 'e2', error: 'ENROLLMENT_NOT_FOUND' });
    expect(partial.notAttempted).toEqual(['e3']);
    // Stops at the first failure: the row after it is never written.
    expect(mocks.forceComplete).toHaveBeenCalledTimes(2);
  });

  it('returns every row when the whole batch succeeds', async () => {
    mocks.forceComplete.mockResolvedValue({ lessonsMarked: 2, completed: false });
    await expect(
      adminMarkEnrollmentsComplete({
        studentId: 'learner',
        enrollmentIds: ['e1', 'e2', 'e3'],
        session: null,
        reason: 'support ticket',
      })
    ).resolves.toEqual({
      updated: 3,
      results: [
        { enrollmentId: 'e1', lessonsMarked: 2, completed: false },
        { enrollmentId: 'e2', lessonsMarked: 2, completed: false },
        { enrollmentId: 'e3', lessonsMarked: 2, completed: false },
      ],
    });
  });
});
