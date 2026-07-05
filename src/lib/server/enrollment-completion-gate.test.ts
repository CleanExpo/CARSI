import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-463 gap / GP-446 baseline: `syncEnrollmentCompletion` (enrollment-service.ts)
 * is the single place that decides an enrolment is "completed" — the state
 * `getEnrollmentForCertificate` requires before a certificate can be issued
 * (see enrollment-service.ts:372, "status !== 'completed' ... return null").
 * Its quiz gate (`allCourseQuizzesPassed`) was previously untested end-to-end.
 *
 * IMPORTANT — this pins CURRENT, DELIBERATE behaviour, not a fix: a course
 * with ZERO quizzes has its quiz gate satisfied VACUOUSLY (enrollment-service.ts
 * comment: "A course with no quizzes is trivially satisfied"), so completing all
 * lessons is enough to issue a certificate even though no assessment ever
 * happened. GP-446 is the tracked future policy change to close this gate for
 * zero-assessment courses. This test exists so that when GP-446 lands, this
 * exact assertion is the one that must flip — making the policy change
 * deliberate and reviewable rather than an accidental behaviour drift.
 */

type EnrollmentRow = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
};

const state = vi.hoisted(() => ({
  enrollment: null as EnrollmentRow | null,
  lessonIds: [] as string[],
  completedLessonCount: 0,
  quizzes: [] as { id: string }[],
  passedQuizIds: [] as string[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: vi.fn(async () => ({
        modules: [{ lessons: state.lessonIds.map((id) => ({ id })) }],
      })),
    },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      findFirst: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Partial<EnrollmentRow> }) => {
        state.enrollment = { ...(state.enrollment as EnrollmentRow), ...args.data };
        return state.enrollment;
      }),
    },
    lmsLessonProgress: {
      count: vi.fn(async () => state.completedLessonCount),
    },
    lmsQuiz: {
      findMany: vi.fn(async () => state.quizzes),
    },
    lmsQuizAttempt: {
      findMany: vi.fn(async () =>
        state.passedQuizIds.map((quizId) => ({ quizId })),
      ),
    },
  },
}));

// Mock the IICRC auto-submit side effect so it never fires a real submission
// during these unit tests (enrollment-service.ts dynamically imports it only
// on a newly-gated completion).
vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));

// Import after mocks are registered so enrollment-service.ts binds to the
// mocked prisma module.
const { syncEnrollmentCompletion } = await import('./enrollment-service');

function resetState(overrides: Partial<typeof state> = {}) {
  state.enrollment = null;
  state.lessonIds = [];
  state.completedLessonCount = 0;
  state.quizzes = [];
  state.passedQuizIds = [];
  Object.assign(state, overrides);
}

describe('syncEnrollmentCompletion — zero-quiz course cert gate (GP-446 baseline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DOCUMENTS CURRENT BEHAVIOUR: a course with NO quizzes completes (and can issue a cert) on lessons alone', async () => {
    resetState({
      enrollment: {
        id: 'enr-1',
        studentId: 'student-1',
        courseId: 'course-no-quiz',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      lessonIds: ['l1', 'l2'],
      completedLessonCount: 2,
      quizzes: [], // zero-assessment course
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-no-quiz');

    expect(state.enrollment?.status).toBe('completed');
    expect(state.enrollment?.completedAt).not.toBeNull();
  });

  it('a course WITH quizzes does NOT complete until every quiz has a passing attempt', async () => {
    resetState({
      enrollment: {
        id: 'enr-2',
        studentId: 'student-1',
        courseId: 'course-with-quiz',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }, { id: 'q2' }],
      passedQuizIds: ['q1'], // only one of two quizzes passed
    });

    await syncEnrollmentCompletion('enr-2', 'student-1', 'course-with-quiz');

    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.completedAt).toBeNull();
  });

  it('completes once ALL quizzes in the course have a passing attempt', async () => {
    resetState({
      enrollment: {
        id: 'enr-3',
        studentId: 'student-1',
        courseId: 'course-with-quiz',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }, { id: 'q2' }],
      passedQuizIds: ['q1', 'q2'],
    });

    await syncEnrollmentCompletion('enr-3', 'student-1', 'course-with-quiz');

    expect(state.enrollment?.status).toBe('completed');
  });

  it('never downgrades an already-completed enrollment even if lessons/quizzes look incomplete now', async () => {
    const priorCompletedAt = new Date('2026-01-01T00:00:00.000Z');
    resetState({
      enrollment: {
        id: 'enr-4',
        studentId: 'student-1',
        courseId: 'course-with-quiz',
        status: 'completed',
        completedAt: priorCompletedAt,
        certificateIssuedAt: priorCompletedAt,
      },
      lessonIds: ['l1', 'l2'],
      completedLessonCount: 1, // now looks incomplete
      quizzes: [{ id: 'q1' }],
      passedQuizIds: [],
    });

    await syncEnrollmentCompletion('enr-4', 'student-1', 'course-with-quiz');

    expect(state.enrollment?.status).toBe('completed');
    expect(state.enrollment?.completedAt).toEqual(priorCompletedAt);
  });

  it('an admin force-complete (bypassQuizGate) completes even with unpassed quizzes outstanding', async () => {
    resetState({
      enrollment: {
        id: 'enr-5',
        studentId: 'student-1',
        courseId: 'course-with-quiz',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }],
      passedQuizIds: [],
    });

    await syncEnrollmentCompletion('enr-5', 'student-1', 'course-with-quiz', {
      bypassQuizGate: true,
    });

    expect(state.enrollment?.status).toBe('completed');
  });

  it('a course with zero lessons resets to active (never "completed" on nothing)', async () => {
    resetState({
      enrollment: {
        id: 'enr-6',
        studentId: 'student-1',
        courseId: 'course-empty',
        status: 'completed',
        completedAt: new Date(),
        certificateIssuedAt: new Date(),
      },
      lessonIds: [],
      completedLessonCount: 0,
      quizzes: [],
    });

    await syncEnrollmentCompletion('enr-6', 'student-1', 'course-empty');

    // enrollment-service.ts: total === 0 short-circuits to { status: 'active',
    // completedAt: null } unconditionally — even overriding a prior completion.
    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.completedAt).toBeNull();
  });
});
