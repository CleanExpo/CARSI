import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ enrollments: vi.fn(), progress: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findMany: mocks.enrollments },
    lmsLessonProgress: { findMany: mocks.progress },
  },
}));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  getCecSubmissionsByEnrollmentIds: vi.fn().mockResolvedValue(new Map()),
}));
// Pretend the course is CEC-approved so the CEC total would show the leak if it existed.
vi.mock('@/lib/server/course-cec-hours', () => ({ resolveLmsCourseCecHours: () => 2 }));

import { getLearnerDashboardSummary } from './learner-dashboard-data';

function row(status: string) {
  return {
    id: `enrollment-${status}`,
    studentId: 'learner',
    courseId: 'course',
    status,
    enrolledAt: new Date(0),
    lastAccessedLessonId: null,
    completedAt: status === 'completed' ? new Date(1) : null,
    certificateIssuedAt: null,
    course: {
      title: 'Course',
      slug: 'course',
      durationHours: null,
      thumbnailUrl: null,
      description: null,
      shortDescription: null,
      category: null,
      modules: [{ lessons: [{ id: 'l1', title: 'Lesson 1' }, { id: 'l2', title: 'Lesson 2' }] }],
    },
  };
}

describe('learner dashboard completion follows enrollment.status (GP-769)', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/test');
    mocks.enrollments.mockReset();
    mocks.progress.mockReset();
    mocks.progress.mockResolvedValue([
      { lessonId: 'l1', completed: true, lastAccessedAt: new Date(2) },
      { lessonId: 'l2', completed: true, lastAccessedAt: new Date(3) },
    ]);
  });

  it('does not report an active enrolment with every lesson done as completed', async () => {
    mocks.enrollments.mockResolvedValue([row('active')]);
    const summary = await getLearnerDashboardSummary('learner');
    expect(summary).not.toBeNull();
    const dto = summary!.enrollments[0];
    expect(dto.status).toBe('active');
    expect(dto.all_lessons_complete).toBe(true);
    expect(dto.completion_percentage).toBe(100);
    expect(summary!.counts).toEqual({ total: 1, active: 1, completed: 0 });
    expect(summary!.cecHoursFromCompleted).toBe(0);
  });

  it('still counts a server-completed enrolment as completed', async () => {
    mocks.enrollments.mockResolvedValue([row('completed')]);
    const summary = await getLearnerDashboardSummary('learner');
    expect(summary!.enrollments[0].status).toBe('completed');
    expect(summary!.counts).toEqual({ total: 1, active: 0, completed: 1 });
    expect(summary!.cecHoursFromCompleted).toBe(2);
  });
});
