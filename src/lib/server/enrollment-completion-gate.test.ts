import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-463 gap / GP-446 baseline: `syncEnrollmentCompletion` (enrollment-service.ts)
 * is the single place that decides an enrolment is "completed" — the state
 * `getEnrollmentForCertificate` requires before a certificate can be issued
 * (see enrollment-service.ts:372, "status !== 'completed' ... return null").
 * Its quiz gate (`allCourseQuizzesPassed`) was previously untested end-to-end.
 *
 * GP-432 flipped the deliberate baseline this file pinned: a course with ZERO
 * assessments used to complete on lessons alone. Now a course approved for IICRC
 * CECs needs at least one assessment, and every required assessment passed, before
 * it completes; a course with no CEC approval and no assessment still completes on
 * lessons (it claims no CEC). The full GP-432 matrix is in gp-432-completion-gate.test.ts.
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
  courseSlug: 'non-cec-course',
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: vi.fn(async () => ({
        slug: state.courseSlug,
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
      // recordFirstCompletion: writes only while firstCompletedAt is still null.
      updateMany: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = state.enrollment as (EnrollmentRow & { firstCompletedAt?: Date | null }) | null;
        if (!row || row.firstCompletedAt) return { count: 0 };
        state.enrollment = { ...row, ...args.data } as EnrollmentRow;
        return { count: 1 };
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
    lmsPracticalAssessment: { findMany: vi.fn(async () => []) },
    lmsAssessmentSubmission: { findMany: vi.fn(async () => []) },
    // Runs the callback on this client; a throw restores the row, as a rollback would.
    // Row lock (enrollment-row-lock.ts#withLockedEnrollment): answers with the enrolment row as
    // the database would, so the owner's ownership and status checks run on real state.
    $queryRaw: async () =>
      state.enrollment
        ? [{ id: (state.enrollment as { id: string }).id, studentId: (state.enrollment as { studentId?: string }).studentId, courseId: 'course', status: (state.enrollment as { status: string }).status }]
        : [],
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      const before = state.enrollment && { ...state.enrollment };
      try {
        return await fn(this);
      } catch (e) {
        state.enrollment = before;
        throw e;
      }
    },
  },
}));

// Mock the IICRC auto-submit side effect so it never fires a real submission
// during these unit tests (enrollment-service.ts dynamically imports it only
// on a newly-gated completion).
// The CEC approvals registry decides which courses are CEC courses (GP-498).
vi.mock('@/lib/server/course-cec-hours', () => ({
  resolveLmsCourseCecHours: (course: { slug: string }) =>
    course.slug === 'cec-course' ? 4 : null,
}));

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
  state.courseSlug = 'non-cec-course';
  Object.assign(state, overrides);
}

describe('syncEnrollmentCompletion — zero-quiz course cert gate (GP-446 baseline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a course with no CEC approval and NO assessment completes on lessons alone (claims no CEC)', async () => {
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

  it('a failed first-completion write rolls the completion back, so the retry still auto-submits (GP-659)', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { processIicrcCecSubmissionForEnrollment } = await import('@/lib/server/iicrc-cec-submission');
    resetState({
      enrollment: {
        id: 'enr-3',
        studentId: 'student-1',
        courseId: 'course-no-quiz',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      lessonIds: ['l1'],
      completedLessonCount: 1,
    });
    vi.mocked(prisma.lmsEnrollment.updateMany).mockRejectedValueOnce(new Error('transient-db-failure'));

    await expect(syncEnrollmentCompletion('enr-3', 'student-1', 'course-no-quiz')).rejects.toThrow(
      'transient-db-failure',
    );
    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.completedAt).toBeNull();
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();

    await syncEnrollmentCompletion('enr-3', 'student-1', 'course-no-quiz');
    const row = state.enrollment as EnrollmentRow & { firstCompletedAt?: Date | null };
    expect(row.status).toBe('completed');
    expect(row.firstCompletedAt).toEqual(row.completedAt);
    expect(processIicrcCecSubmissionForEnrollment).toHaveBeenCalledTimes(1);
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

  it('GP-432: a CEC course with NO assessment does not complete on lessons alone', async () => {
    resetState({
      enrollment: {
        id: 'enr-5',
        studentId: 'student-1',
        courseId: 'course-cec',
        status: 'active',
        completedAt: null,
        certificateIssuedAt: null,
      },
      courseSlug: 'cec-course',
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [],
    });

    await syncEnrollmentCompletion('enr-5', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('active');
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
