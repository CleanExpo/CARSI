import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-659: the admin manual IICRC send completes an active enrolment when needed. That completion
 * must also record the first completion, like every other completion writer, so a later
 * revocation and re-completion cannot move the CEC into a newer renewal period.
 */

const state = vi.hoisted(() => ({
  enrollment: null as null | Record<string, unknown>,
}));

const recordFirstCompletion = vi.hoisted(() => vi.fn(async () => {}));

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
  },
}));

vi.mock('@/lib/server/enrollment-service', () => ({ recordFirstCompletion }));

const { manualSendIicrcCecForEnrollment } = await import('./iicrc-cec-submission');

describe('manual IICRC send records the first completion (GP-659)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enrollment = {
      id: 'enr-1',
      studentId: 'stu-1',
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

  it('an active enrolment completed by the manual send gets its first completion recorded', async () => {
    // The course is not CEC-eligible, so the send stops after completing the enrolment.
    await expect(
      manualSendIicrcCecForEnrollment({ enrollmentId: 'enr-1', studentId: 'stu-1' })
    ).rejects.toThrow();
    expect(state.enrollment?.status).toBe('completed');
    expect(recordFirstCompletion).toHaveBeenCalledWith('enr-1', state.enrollment?.completedAt);
  });
});
