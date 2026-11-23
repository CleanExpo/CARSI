import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { CCW_ATTENDANCE_PAYMENT_REFERENCE } from '@/lib/server/ccw-attendance/provision';
import { COHORT_ENROLMENT_PAYMENT_REFERENCE } from '@/lib/server/carsi-workshop-access';

/**
 * GP-736 review findings: the cohort workshop course (ccw-2-day-workshop) has exactly one
 * way in for learners, the Day-1 attendance check-in, and exactly one way to completion, the
 * two-day attendance finalisation. These tests pin both rules on the shared writers, so no
 * route (free confirm, guest-free, membership, team seat, Stripe) can bypass them.
 */
const COHORT = 'ccw-2-day-workshop';

const state = vi.hoisted(() => ({
  courseSlug: 'ccw-2-day-workshop',
  enrollment: null as Record<string, unknown> | null,
  created: null as Record<string, unknown> | null,
  lessonIds: ['l1', 'l2'] as string[],
}));

vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async () => ({
    id: 'crs',
    slug: state.courseSlug,
    isFree: true,
    priceAud: 0,
  })),
}));
vi.mock('@/lib/server/course-prerequisites', () => ({
  findCoursePrerequisiteBlock: vi.fn(async () => null),
  PrerequisiteNotMetError: class extends Error {},
}));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: vi.fn(async () => ({
        id: 'crs',
        slug: state.courseSlug,
        modules: [{ lessons: state.lessonIds.map((id) => ({ id })) }],
      })),
    },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.enrollment = { ...(state.enrollment ?? {}), ...args.data };
        return state.enrollment;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.created = args.data;
        return { id: args.data.id };
      }),
    },
    lmsLessonProgress: { count: vi.fn(async () => state.lessonIds.length) },
    lmsQuiz: { findMany: vi.fn(async () => []) },
    // GP-432: published practical assessments also gate completion; none in these courses.
    lmsPracticalAssessment: { findMany: vi.fn(async () => []) },
    lmsAssessmentSubmission: { findMany: vi.fn(async () => []) },
    lmsQuizAttempt: { findMany: vi.fn(async () => []) },
    // Row lock (enrollment-row-lock.ts): the sync reads the prior status after it, via findUnique.
    $queryRaw: async () => [{ id: "locked-row" }],
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn(this);
    },
  },
}));

const enrolmentService = await import('./enrollment-service');
const { prisma: prismaForSeatWrites } = await import('@/lib/prisma');
// GP-759: `cs_*` and `team:*` enrolments are issued only inside the seat step (seat-state.ts).
// These tests check the shared writer's row rules, so for those references they call its two
// halves (prepare, then issue on a client) the way the step does; other references go through
// enrollStudentInCourse as production does.
const enrollStudentInCourse: typeof enrolmentService.enrollStudentInCourse = (claims, slug, ref, options) =>
  enrolmentService.isSeatStatePaymentReference(ref)
    ? enrolmentService
        .prepareEnrolment(claims, slug, ref, options)
        .then((prepared) => enrolmentService.issuePreparedEnrolment(prismaForSeatWrites as never, prepared))
    : enrolmentService.enrollStudentInCourse(claims, slug, ref, options);
const { syncEnrollmentCompletion } = enrolmentService;

const learner: SessionClaims = { sub: 'stu', email: 'a@example.com', full_name: 'A', role: 'student' };

beforeEach(() => {
  vi.clearAllMocks();
  state.courseSlug = COHORT;
  state.enrollment = null;
  state.created = null;
  state.lessonIds = ['l1', 'l2'];
});

describe('cohort workshop enrolment writer', () => {
  it('uses the same payment reference as the attendance provisioner', () => {
    expect(COHORT_ENROLMENT_PAYMENT_REFERENCE).toBe(CCW_ATTENDANCE_PAYMENT_REFERENCE);
  });

  it.each(['free', 'membership:stu', 'org:t1', 'team-seat:t1', 'team:t1', 'cs_test_123', 'discount:d1'])(
    'refuses a self-serve enrolment with payment reference %s',
    async (ref) => {
      await expect(enrollStudentInCourse(learner, COHORT, ref)).rejects.toThrow(
        'COURSE_NOT_SELF_ENROLABLE'
      );
      expect(state.created).toBeNull();
    }
  );

  it('refuses to reactivate a revoked cohort enrolment through a self-serve path', async () => {
    state.enrollment = { id: 'enr-1', status: 'revoked', completedAt: null };
    await expect(enrollStudentInCourse(learner, COHORT, 'free')).rejects.toThrow(
      'COURSE_NOT_SELF_ENROLABLE'
    );
    expect(state.enrollment.status).toBe('revoked');
  });

  it('allows the Day-1 attendance check-in and an admin-created enrolment', async () => {
    expect(await enrollStudentInCourse(learner, COHORT, CCW_ATTENDANCE_PAYMENT_REFERENCE)).toMatchObject({
      courseId: 'crs',
    });
    state.created = null;
    expect(await enrollStudentInCourse(learner, COHORT, 'admin:manual')).toMatchObject({ courseId: 'crs' });
  });

  it('leaves other free courses self-enrolable', async () => {
    state.courseSlug = 'some-free-course';
    expect(await enrollStudentInCourse(learner, 'some-free-course', 'free')).toMatchObject({
      courseId: 'crs',
    });
  });
});

describe('cohort workshop completion', () => {
  it('does not mark the course completed from lessons and quizzes alone (attendance owns completion)', async () => {
    state.enrollment = { id: 'enr-1', status: 'active', completedAt: null };
    await syncEnrollmentCompletion('enr-1', 'stu', 'crs');
    expect(state.enrollment.status).toBe('active');
    expect(state.enrollment.completedAt ?? null).toBeNull();
  });

  it('never downgrades a completion written by the two-day attendance finalisation', async () => {
    const at = new Date('2026-11-01T00:00:00.000Z');
    state.enrollment = { id: 'enr-1', status: 'completed', completedAt: at, certificateIssuedAt: at };
    state.lessonIds = ['l1', 'l2', 'l3'];
    await syncEnrollmentCompletion('enr-1', 'stu', 'crs');
    expect(state.enrollment.status).toBe('completed');
    expect(state.enrollment.completedAt).toBe(at);
  });

  it('still completes an ordinary course on lessons and quizzes', async () => {
    state.courseSlug = 'some-course';
    state.enrollment = { id: 'enr-2', status: 'active', completedAt: null };
    await syncEnrollmentCompletion('enr-2', 'stu', 'crs');
    expect(state.enrollment.status).toBe('completed');
  });
});
