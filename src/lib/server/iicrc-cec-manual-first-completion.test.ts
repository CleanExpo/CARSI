import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-659 / GP-432: the admin manual IICRC send may complete an active enrolment only through the
 * one gated writer, syncEnrollmentCompletion. That writer records the first completion (GP-659,
 * covered in enrollment-completion-gate.test.ts) and completes only when every lesson is done
 * and every required assessment is passed (GP-432). The manual send never writes `completed`
 * itself, so it cannot file a CEC for a learner who has not passed the assessment.
 */

const state = vi.hoisted(() => ({
  enrollment: null as null | Record<string, unknown>,
}));

const syncEnrollmentCompletion = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => {}),
);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.enrollment = { ...state.enrollment, ...args.data };
        return state.enrollment;
      }),
    },
    lmsIicrcCecSubmission: { findUnique: vi.fn(async () => null) },
    // Runs the callback on this client; a throw restores the row, as a rollback would.
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

vi.mock('@/lib/server/enrollment-service', () => ({ syncEnrollmentCompletion }));

const { manualSendIicrcCecForEnrollment } = await import('./iicrc-cec-submission');

describe('manual IICRC send records the first completion (GP-659)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enrollment = {
      id: 'enr-1',
      studentId: 'stu-1',
      courseId: 'c1',
      status: 'active',
      completedAt: null,
      certificateIssuedAt: null,
      student: { id: 'stu-1', email: 'a@b.c', fullName: 'A', iicrcMemberNumber: '12345' },
      course: {
        id: 'c1',
        slug: 'not-a-cec-course',
        title: 'T',
        cecHours: null,
        meta: null,
        iicrcDiscipline: null,
      },
    };
  });

  it('an active enrolment goes through the gated writer, never a direct completed write', async () => {
    const { prisma } = await import('@/lib/prisma');
    // The gated writer completes it (all lessons and assessments passed in this case).
    syncEnrollmentCompletion.mockImplementationOnce(async () => {
      state.enrollment = { ...state.enrollment, status: 'completed', completedAt: new Date() };
    });
    // The course is not CEC-eligible, so the send stops after completing the enrolment.
    await expect(
      manualSendIicrcCecForEnrollment({ enrollmentId: 'enr-1', studentId: 'stu-1' })
    ).rejects.toThrow('COURSE_NOT_CEC_ELIGIBLE');
    expect(syncEnrollmentCompletion).toHaveBeenCalledWith('enr-1', 'stu-1', 'c1', {
      skipIicrcAutoSubmit: true,
    });
    expect(prisma.lmsEnrollment.update).not.toHaveBeenCalled();
  });

  it('GP-432: when the gated writer leaves it active (assessment not passed), the send refuses', async () => {
    await expect(
      manualSendIicrcCecForEnrollment({ enrollmentId: 'enr-1', studentId: 'stu-1' })
    ).rejects.toThrow('ENROLLMENT_NOT_COMPLETED');
    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.completedAt).toBeNull();
  });
});
