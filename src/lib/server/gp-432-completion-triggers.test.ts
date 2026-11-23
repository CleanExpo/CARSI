import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * GP-432: once assessments gate completion, passing one can be the last thing an enrolment
 * needs (for example after an admin marked every lesson). Every writer of a passed quiz attempt
 * or a passed practical must then re-run the gated completion sync, or the enrolment stays
 * active and the IICRC auto-submit never fires. Failed results must not trigger it.
 */

const STUDENT = '40000000-0000-4000-8000-000000000001';
const LESSON = '40000000-0000-4000-8000-000000000002';
const QUIZ = '40000000-0000-4000-8000-000000000003';
const QUESTION = '40000000-0000-4000-8000-000000000004';
const COURSE = '40000000-0000-4000-8000-000000000005';
const SUBMISSION = '40000000-0000-4000-8000-000000000006';
const CRITERION = '40000000-0000-4000-8000-000000000007';
const VERSION = 'b'.repeat(64);

const mocks = vi.hoisted(() => ({
  sync: vi.fn(async () => {}),
  claims: vi.fn(),
  graph: vi.fn(),
  quiz: vi.fn(),
  enrollment: vi.fn(),
  raw: vi.fn(),
  create: vi.fn(),
  submission: vi.fn(),
  submissionUpdate: vi.fn(),
}));

vi.mock('@/lib/server/enrollment-service', () => ({
  syncCompletionAfterAssessmentPassed: mocks.sync,
  ensureStaffEnrollmentForQuiz: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
vi.mock('@/lib/server/course-prerequisites', async (original) => ({
  ...(await original<typeof import('@/lib/server/course-prerequisites')>()),
  findQuizPrerequisiteBlock: vi.fn(async () => null),
}));
vi.mock('@/lib/server/lesson-checkpoint', async (original) => ({
  ...(await original<typeof import('./lesson-checkpoint')>()),
  getVersionBoundQuizForAttempt: mocks.graph,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsQuiz: { findUnique: mocks.quiz },
    lmsEnrollment: { findFirst: mocks.enrollment },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: mocks.raw,
        lmsQuizAttempt: { create: mocks.create },
        lmsEnrollment: { findUnique: async () => ({ id: 'enr-1' }) },
        lmsAssessmentSubmission: { findUnique: mocks.submission, update: mocks.submissionUpdate },
      }),
    ),
  },
}));

const { POST } = await import('../../../app/api/lms/quizzes/[quizId]/attempt/route');
const { reviewSubmission } = await import('./practical-assessment');

const quiz = {
  id: QUIZ,
  courseId: COURSE,
  passPercentage: 80,
  attemptsAllowed: 3,
  questions: [{ id: QUESTION, correctIndex: 1, points: 1, options: ['A', 'B'], explanation: null }],
};
const ctx = { params: Promise.resolve({ quizId: QUIZ }) };

function attempt(body: unknown, bound: boolean) {
  return new NextRequest(`http://localhost/api/lms/quizzes/${QUIZ}/attempt`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: bound ? { 'x-carsi-learner-id': STUDENT } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue({ sub: STUDENT });
  mocks.graph.mockResolvedValue({ quiz, questions: quiz.questions, contentVersion: VERSION });
  mocks.quiz.mockResolvedValue(quiz);
  mocks.enrollment.mockResolvedValue({ id: 'enr' });
  mocks.create.mockResolvedValue({ id: 'legacy-attempt' });
  mocks.raw.mockImplementation(async (sql: TemplateStringsArray) => {
    const text = sql.join('?');
    if (/COUNT/i.test(text)) return [{ count: 0 }];
    if (text.includes('explanation')) return [];
    // GP-432: the owner's row lock (withLockedEnrollment) sees an active enrolment for the learner.
    if (text.includes('FROM lms_enrollments') && text.includes('FOR UPDATE')) {
      return [{ id: 'enr-1', studentId: STUDENT, courseId: COURSE, status: 'active' }];
    }
    return [{ id: 'bound-attempt' }];
  });
});

describe('GP-432: a passed quiz attempt re-runs the completion sync', () => {
  it.each([
    ['version-bound', true],
    ['legacy', false],
  ])('%s path: pass triggers the sync for the quiz course', async (_label, bound) => {
    const body = bound
      ? { lessonId: LESSON, contentVersion: VERSION, answers: { [QUESTION]: 1 } }
      : { answers: { [QUESTION]: 1 } };

    const res = await POST(attempt(body, bound), ctx);

    expect(res.status).toBe(200);
    expect(((await res.json()) as { passed: boolean }).passed).toBe(true);
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith(STUDENT, COURSE);
  });

  it.each([
    ['version-bound', true],
    ['legacy', false],
  ])('%s path: a failed attempt does not trigger it', async (_label, bound) => {
    const body = bound
      ? { lessonId: LESSON, contentVersion: VERSION, answers: { [QUESTION]: 0 } }
      : { answers: { [QUESTION]: 0 } };

    const res = await POST(attempt(body, bound), ctx);

    expect(res.status).toBe(200);
    expect(((await res.json()) as { passed: boolean }).passed).toBe(false);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});

describe('GP-432: a passed practical review re-runs the completion sync', () => {
  function pendingSubmission() {
    return {
      id: SUBMISSION,
      studentId: STUDENT,
      status: 'submitted',
      assessment: {
        courseId: COURSE,
        passThreshold: 70,
        criteria: [{ id: CRITERION, label: 'Moisture map', maxPoints: 10, critical: false }],
      },
    };
  }

  beforeEach(() => {
    mocks.submission.mockResolvedValue(pendingSubmission());
    mocks.submissionUpdate.mockImplementation(async (args: { data: { status: string } }) => ({
      id: SUBMISSION,
      status: args.data.status,
    }));
  });

  it('a pass triggers the sync for the assessment course', async () => {
    const r = await reviewSubmission({ submissionId: SUBMISSION, scores: [{ criterionId: CRITERION, points: 9 }] });

    expect(r.passed).toBe(true);
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith(STUDENT, COURSE);
  });

  it('a fail does not trigger it', async () => {
    const r = await reviewSubmission({ submissionId: SUBMISSION, scores: [{ criterionId: CRITERION, points: 2 }] });

    expect(r.passed).toBe(false);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
