import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

/**
 * GP-737 (1): an allow-listed instructor who opens a knowledge check or a quiz before any
 * lesson must get the same staff auto-enrolment the lesson GET and progress PATCH give, and
 * it must run BEFORE the route's enrolment check. Without it they got 404/403 until they
 * happened to open a lesson first.
 */
const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  staffForLesson: vi.fn(),
  staffForQuiz: vi.fn(),
  getCheckpoint: vi.fn(),
  saveCheckpoint: vi.fn(),
  quizFindUnique: vi.fn(),
  enrolFindFirst: vi.fn(),
  attemptCount: vi.fn(),
}));

vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
vi.mock('@/lib/server/enrollment-service', () => ({
  ensureStaffEnrollmentForLesson: mocks.staffForLesson,
  ensureStaffEnrollmentForQuiz: mocks.staffForQuiz,
}));
vi.mock('@/lib/server/course-prerequisites', async (original) => ({
  ...(await original<typeof import('@/lib/server/course-prerequisites')>()),
  findLessonPrerequisiteBlock: vi.fn(async () => null),
  findQuizPrerequisiteBlock: vi.fn(async () => null),
  findEnrolledCoursePrerequisiteBlock: vi.fn(async () => null),
}));
vi.mock('@/lib/server/lesson-checkpoint', async (original) => ({
  ...(await original<typeof import('./lesson-checkpoint')>()),
  getLessonCheckpoint: mocks.getCheckpoint,
  saveLessonCheckpoint: mocks.saveCheckpoint,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsQuiz: { findUnique: mocks.quizFindUnique },
    lmsEnrollment: { findFirst: mocks.enrolFindFirst },
    lmsQuizAttempt: { count: mocks.attemptCount },
    // countCountedQuizAttempts (GP-432) reads the non-voided count with one raw query.
    $queryRaw: vi.fn(async () => [{ count: 0 }]),
  },
}));

const checkpoint = await import('../../../app/api/lms/lessons/[lessonId]/checkpoint/route');
const quiz = await import('../../../app/api/lms/quizzes/[quizId]/route');
const attempt = await import('../../../app/api/lms/quizzes/[quizId]/attempt/route');

const staffId = '10000000-0000-4000-8000-0000000000aa';
const lessonId = '10000000-0000-4000-8000-000000000002';
const quizId = '10000000-0000-4000-8000-000000000003';
const instructor: SessionClaims = {
  sub: staffId,
  email: 'instructor@example.test',
  full_name: 'Instructor',
  role: 'instructor',
};
const draft = {
  expectedRevision: 0,
  contentVersion: 'a'.repeat(64),
  position: { kind: 'reading', value: 0 },
  answers: {},
};

function order(fn: { mock: { invocationCallOrder: number[] } }): number {
  expect(fn.mock.invocationCallOrder.length).toBeGreaterThan(0);
  return fn.mock.invocationCallOrder[0]!;
}

beforeEach(() => {
  vi.clearAllMocks();
  // The legacy attempt path goes on to grade inside a transaction this fake does not provide;
  // only the order of the staff grant and the enrolment check matters here.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue(instructor);
  mocks.staffForLesson.mockResolvedValue(undefined);
  mocks.staffForQuiz.mockResolvedValue(undefined);
  mocks.getCheckpoint.mockResolvedValue({ revision: 0 });
  mocks.saveCheckpoint.mockResolvedValue({ revision: 1 });
  mocks.quizFindUnique.mockResolvedValue({
    id: quizId,
    courseId: 'course-1',
    title: 'Knowledge check',
    passPercentage: 70,
    timeLimitMinutes: null,
    attemptsAllowed: 3,
    questions: [],
    course: { id: 'course-1' },
  });
  mocks.enrolFindFirst.mockResolvedValue({ id: 'enr-1', status: 'active' });
  mocks.attemptCount.mockResolvedValue(0);
});

describe('staff auto-enrolment on the knowledge-check and quiz routes (GP-737)', () => {
  it('checkpoint GET enrols staff before reading the checkpoint', async () => {
    const res = await checkpoint.GET(
      new NextRequest(`http://localhost/api/lms/lessons/${lessonId}/checkpoint`, {
        headers: { 'x-carsi-learner-id': staffId },
      }),
      { params: Promise.resolve({ lessonId }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.staffForLesson).toHaveBeenCalledWith(instructor, lessonId);
    expect(order(mocks.staffForLesson)).toBeLessThan(order(mocks.getCheckpoint));
  });

  it('checkpoint PATCH enrols staff before saving the checkpoint', async () => {
    const res = await checkpoint.PATCH(
      new NextRequest(`http://localhost/api/lms/lessons/${lessonId}/checkpoint`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
        headers: { 'x-carsi-learner-id': staffId },
      }),
      { params: Promise.resolve({ lessonId }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.staffForLesson).toHaveBeenCalledWith(instructor, lessonId);
    expect(order(mocks.staffForLesson)).toBeLessThan(order(mocks.saveCheckpoint));
  });

  it('quiz GET enrols staff before the enrolment check', async () => {
    const res = await quiz.GET(new NextRequest(`http://localhost/api/lms/quizzes/${quizId}`), {
      params: Promise.resolve({ quizId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.staffForQuiz).toHaveBeenCalledWith(instructor, quizId);
    expect(order(mocks.staffForQuiz)).toBeLessThan(order(mocks.enrolFindFirst));
  });

  it('quiz attempt POST enrols staff before the enrolment check', async () => {
    await attempt.POST(
      new NextRequest(`http://localhost/api/lms/quizzes/${quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ quizId }) }
    );
    expect(mocks.staffForQuiz).toHaveBeenCalledWith(instructor, quizId);
    expect(order(mocks.staffForQuiz)).toBeLessThan(order(mocks.enrolFindFirst));
  });
});
