import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/iicrc-renewal-communication', () => ({
  getRenewalSummaryByEnrollmentIds: vi.fn(),
}));

import { mapUserToAdminProgress } from './admin-user-progress';

const user = {
  id: 'learner',
  email: 'learner@example.test',
  fullName: 'Synthetic Learner',
  role: 'student',
  isActive: true,
  isVerified: true,
  iicrcMemberNumber: null,
  iicrcExpiryDate: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function enrollment(id: string, status: string) {
  return {
    id,
    studentId: 'learner',
    courseId: `course-${id}`,
    status,
    paymentReference: null,
    enrolledAt: new Date(0),
    completedAt: status === 'completed' ? new Date(1) : null,
    certificateIssuedAt: null,
    course: {
      id: `course-${id}`,
      slug: `synthetic-${id}`,
      title: `Course ${id}`,
      iicrcDiscipline: null,
      isFree: true,
      priceAud: 0,
      modules: [{ lessons: [{ id: `${id}-l1` }, { id: `${id}-l2` }] }],
    },
  };
}

describe('admin learner course counts follow enrollment.status (GP-769)', () => {
  it('counts an active enrolment with every lesson done as active, not completed', () => {
    const progress = mapUserToAdminProgress(
      user,
      [enrollment('a', 'active'), enrollment('b', 'completed')],
      new Map(),
      new Map([
        ['learner-course-a', 2],
        ['learner-course-b', 2],
      ]),
      null,
    );
    expect(progress.enrollments.map((e) => e.completionPct)).toEqual([100, 100]);
    expect(progress.completedCourseCount).toBe(1);
    expect(progress.activeCourseCount).toBe(1);
  });
});
