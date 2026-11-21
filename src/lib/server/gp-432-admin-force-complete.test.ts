import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * GP-432 path 4: admin "force complete" (POST /api/admin/enrollments/complete).
 * GP-432 records no founder ruling that lets an admin skip assessments, so force-complete
 * now only marks lessons: it needs a stated reason, writes an audit row naming the admin,
 * and the enrolment completes only when the required assessments are passed. Before this
 * change it bypassed the quiz gate and fired the IICRC CEC auto-submit with no record of
 * who did it or why.
 */

const ADMIN_ID = '30000000-0000-4000-8000-000000000001';
const STUDENT_ID = '30000000-0000-4000-8000-000000000002';
const ENROLLMENT_ID = '30000000-0000-4000-8000-000000000003';
const COURSE_ID = '30000000-0000-4000-8000-000000000004';

const state = vi.hoisted(() => ({
  enrollment: null as null | Record<string, unknown>,
  audits: [] as Array<Record<string, unknown>>,
  progressWrites: 0,
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn(async () => ({ email: 'admin@example.test' })),
}));
vi.mock('@/lib/server/review-admin-session', () => ({
  readReviewAdminSession: vi.fn(async () => ({ via: 'lms_session', userId: ADMIN_ID, email: 'admin@example.test' })),
}));
vi.mock('@/lib/server/current-admin', async (original) => ({
  ...(await original<typeof import('@/lib/server/current-admin')>()),
  requireCurrentAdmin: vi.fn(async () => ({ kind: 'lms_admin', ref: ADMIN_ID, email: 'admin@example.test' })),
}));
vi.mock('@/lib/server/course-cec-hours', () => ({ resolveLmsCourseCecHours: () => 4 }));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: vi.fn(async () => ({ id: STUDENT_ID })) },
    lmsCourse: {
      findUnique: vi.fn(async () => ({ slug: 'cec-course', modules: [{ lessons: [{ id: 'l1' }, { id: 'l2' }] }] })),
    },
    lmsEnrollment: {
      findMany: vi.fn(async () => [{ id: ENROLLMENT_ID }]),
      findFirst: vi.fn(async () => state.enrollment),
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.enrollment = { ...state.enrollment, ...args.data };
        return state.enrollment;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    lmsLessonProgress: {
      upsert: vi.fn(async () => {
        state.progressWrites += 1;
        return {};
      }),
      count: vi.fn(async () => 2),
    },
    // One quiz in the course, never passed by this learner.
    lmsQuiz: { findMany: vi.fn(async () => [{ id: 'q1' }]) },
    lmsQuizAttempt: { findMany: vi.fn(async () => []) },
    lmsPracticalAssessment: { findMany: vi.fn(async () => []) },
    lmsAssessmentSubmission: { findMany: vi.fn(async () => []) },
    lmsLearnerAdminAuditEvent: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.audits.push(args.data);
        return args.data;
      }),
    },
    async $transaction(arg: unknown) {
      if (typeof arg === 'function') return (arg as (tx: unknown) => Promise<unknown>)(this);
      return Promise.all(arg as Promise<unknown>[]);
    },
  },
}));

const { POST } = await import('../../../app/api/admin/enrollments/complete/route');

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin/enrollments/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.enrollment = {
    id: ENROLLMENT_ID,
    studentId: STUDENT_ID,
    courseId: COURSE_ID,
    status: 'active',
    completedAt: null,
  };
  state.audits = [];
  state.progressWrites = 0;
});

describe('GP-432 path 4: admin force-complete', () => {
  it.each([undefined, '', '   '])('refuses without a reason (%j) and changes nothing', async (reason) => {
    const res = await POST(request({ studentId: STUDENT_ID, enrollmentIds: [ENROLLMENT_ID], reason }));

    expect(res.status).toBe(400);
    expect(state.progressWrites).toBe(0);
    expect(state.audits).toEqual([]);
  });

  it('writes an audit row with the admin id and reason, and does not bypass the unpassed quiz', async () => {
    const { processIicrcCecSubmissionForEnrollment } = await import('@/lib/server/iicrc-cec-submission');

    const res = await POST(
      request({ studentId: STUDENT_ID, enrollmentIds: [ENROLLMENT_ID], reason: 'Attended the live session; lesson pages failed to record' }),
    );

    expect(res.status).toBe(200);
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      action: 'force_complete',
      reason: 'Attended the live session; lesson pages failed to record',
      actorKind: 'lms_admin',
      actorRef: ADMIN_ID,
      actorEmail: 'admin@example.test',
      studentRef: STUDENT_ID,
      enrollmentRef: ENROLLMENT_ID,
      courseRef: COURSE_ID,
    });
    expect(state.enrollment?.status).toBe('active');
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();
    const body = (await res.json()) as { results: Array<{ completed: boolean }> };
    expect(body.results[0].completed).toBe(false);
  });

  it('refuses an admin the database no longer recognises, before any write', async () => {
    const { requireCurrentAdmin, NotCurrentAdminError } = await import('@/lib/server/current-admin');
    vi.mocked(requireCurrentAdmin).mockRejectedValueOnce(new NotCurrentAdminError());

    const res = await POST(request({ studentId: STUDENT_ID, enrollmentIds: [ENROLLMENT_ID], reason: 'Support request' }));

    expect(res.status).toBe(403);
    expect(state.progressWrites).toBe(0);
    expect(state.audits).toEqual([]);
  });
});
