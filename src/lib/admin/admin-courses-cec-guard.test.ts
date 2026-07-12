import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS6 (P1) — course-delete paths must not erase IICRC CEC compliance records
 * (now FK-RESTRICT-protected). adminDeleteCourse refuses a course with CEC
 * records; adminBulkDeleteCourses filters them out of the batch.
 */
const mock = vi.hoisted(() => ({
  courseFindUnique: vi.fn(),
  cecCount: vi.fn(),
  courseDelete: vi.fn(),
  cecFindMany: vi.fn(),
  courseDeleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: mock.courseFindUnique,
      delete: mock.courseDelete,
      deleteMany: mock.courseDeleteMany,
    },
    lmsIicrcCecSubmission: { count: mock.cecCount, findMany: mock.cecFindMany },
  },
}));

const { adminDeleteCourse, adminBulkDeleteCourses } = await import('./admin-courses-service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminDeleteCourse — CEC guard', () => {
  it('deletes a course with no CEC records', async () => {
    mock.courseFindUnique.mockResolvedValueOnce({ id: 'c1' });
    mock.cecCount.mockResolvedValueOnce(0);
    await adminDeleteCourse('c1');
    expect(mock.courseDelete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('refuses to delete a course carrying CEC records', async () => {
    mock.courseFindUnique.mockResolvedValueOnce({ id: 'c1' });
    mock.cecCount.mockResolvedValueOnce(3);
    await expect(adminDeleteCourse('c1')).rejects.toThrow('COURSE_HAS_CEC_RECORDS');
    expect(mock.courseDelete).not.toHaveBeenCalled();
  });
});

describe('adminBulkDeleteCourses — CEC filter', () => {
  it('excludes CEC-bearing courses and deletes the rest', async () => {
    mock.cecFindMany.mockResolvedValueOnce([{ courseId: 'c2' }]);
    mock.courseDeleteMany.mockResolvedValueOnce({ count: 2 });
    const n = await adminBulkDeleteCourses(['c1', 'c2', 'c3']);
    expect(n).toBe(2);
    expect(mock.courseDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['c1', 'c3'] } } });
  });

  it('deletes nothing (and does not call deleteMany) when all are CEC-bearing', async () => {
    mock.cecFindMany.mockResolvedValueOnce([{ courseId: 'c1' }, { courseId: 'c2' }]);
    const n = await adminBulkDeleteCourses(['c1', 'c2']);
    expect(n).toBe(0);
    expect(mock.courseDeleteMany).not.toHaveBeenCalled();
  });
});
