import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ enrollments: vi.fn(), progress: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { lmsEnrollment: { findMany: mocks.enrollments }, lmsLessonProgress: { findMany: mocks.progress } } }));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({ getCecSubmissionsByEnrollmentIds: vi.fn().mockResolvedValue(new Map()) }));
import { getResumeSnapshotForStudent } from './learner-dashboard-data';

function row(status: string, pointer = 'lesson') { return { id: 'enrollment', studentId: 'learner', status, enrolledAt: new Date(0),
  lastAccessedLessonId: pointer, course: { title: 'Course', slug: 'course', modules: [{ lessons: [{ id: 'lesson', title: 'Lesson' }] }] } }; }
describe('learner resume access', () => {
  beforeEach(() => { vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/test'); mocks.enrollments.mockReset(); mocks.progress.mockReset(); mocks.progress.mockResolvedValue([]); });
  it.each(['revoked', 'refunded', 'disputed', 'cancelled', 'unknown'])('never returns a %s enrollment', async (status) => {
    mocks.enrollments.mockResolvedValue([row(status)]); expect(await getResumeSnapshotForStudent('learner')).toBeNull();
    expect(mocks.enrollments.mock.calls[0][0]).toMatchObject({ where: { studentId: 'learner', status: { in: ['active', 'completed'] } }, take: 200 });
  });
  it('rejects a pointer to another course', async () => { mocks.enrollments.mockResolvedValue([row('active', 'foreign')]); expect(await getResumeSnapshotForStudent('learner')).toBeNull(); });
  it.each(['active', 'completed'])('returns a valid %s pointer', async (status) => {
    mocks.enrollments.mockResolvedValue([row(status)]); expect(await getResumeSnapshotForStudent('learner')).toMatchObject({ lesson_id: 'lesson', resume_href: '/dashboard/learn/course?lesson=lesson' });
  });
});
