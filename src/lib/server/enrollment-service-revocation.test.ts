import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS3 (P0-C) — refund/revocation integrity regression suite.
 *
 * These pin the two audited defects and their fix at the SERVICE layer (mocked
 * prisma, exactly like enrollment-completion-gate.test.ts):
 *  1. SILENT REVERT — syncEnrollmentCompletion must NEVER resurrect a
 *     revoked/cancelled/refunded enrolment to active/completed (a refunded learner
 *     could otherwise un-revoke themselves by marking a lesson or opening the cert).
 *  2. RETAINED ACCESS / CERT RE-ISSUE — a revoked enrolment must get no lesson
 *     context and no certificate.
 * Every assertion here FAILS on origin/main (proving the live bug) and PASSES after
 * the WB/WC/WD fixes. Legit states (completed / active) must keep working.
 */

type Enr = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
  student?: { email: string; fullName: string | null };
  course?: Record<string, unknown>;
};

const state = vi.hoisted(() => ({
  enrollment: null as Enr | null,
  lessonIds: [] as string[],
  completedLessonCount: 0,
  quizzes: [] as { id: string }[],
  passedQuizIds: [] as string[],
  lesson: null as Record<string, unknown> | null,
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
      update: vi.fn(async (args: { data: Partial<Enr> }) => {
        state.enrollment = { ...(state.enrollment as Enr), ...args.data };
        return state.enrollment;
      }),
      updateMany: vi.fn(async (args: { where: { status?: string }; data: Partial<Enr> }) => {
        if (state.enrollment && (!args.where.status || state.enrollment.status === args.where.status)) {
          state.enrollment = { ...state.enrollment, ...args.data };
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    lmsLesson: { findUnique: vi.fn(async () => state.lesson) },
    lmsLessonProgress: { count: vi.fn(async () => state.completedLessonCount) },
    lmsQuiz: { findMany: vi.fn(async () => state.quizzes) },
    lmsQuizAttempt: {
      findMany: vi.fn(async () => state.passedQuizIds.map((quizId) => ({ quizId }))),
    },
  },
}));

vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));

const {
  syncEnrollmentCompletion,
  getEnrollmentForCertificate,
  getLessonContextForStudent,
  markCertificateIssued,
} = await import('./enrollment-service');

const COURSE = {
  title: 'T',
  slug: 's',
  iicrcDiscipline: null,
  cecHours: null,
  shortDescription: null,
  description: null,
  meta: null,
  durationHours: null,
  level: null,
};

function seedEnrollment(status: string, completedAt: Date | null): void {
  state.enrollment = {
    id: 'enr-r',
    studentId: 'stu',
    courseId: 'crs',
    status,
    completedAt,
    certificateIssuedAt: null,
    student: { email: 'a@b.c', fullName: 'A' },
    course: COURSE,
  };
  // A fully-completed-looking course so nothing is legitimately "incomplete".
  state.lessonIds = ['l1', 'l2'];
  state.completedLessonCount = 2;
  state.quizzes = [];
}

function seedLesson(): void {
  state.lesson = {
    id: 'l1',
    title: 'L1',
    contentType: 'text',
    contentBody: 'PAID SECRET BODY',
    orderIndex: 0,
    isPreview: false,
    resources: null,
    module: { courseId: 'crs', course: { id: 'crs', slug: 's', title: 'T' } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.enrollment = null;
  state.lesson = null;
  state.lessonIds = [];
  state.completedLessonCount = 0;
  state.quizzes = [];
  state.passedQuizIds = [];
});

describe('WS3 sticky revocation — a revoked enrolment is terminal', () => {
  for (const status of ['revoked', 'cancelled', 'refunded']) {
    it(`syncEnrollmentCompletion never resurrects a '${status}' enrolment (completedAt survives from before the refund)`, async () => {
      seedEnrollment(status, new Date('2026-01-01T00:00:00.000Z'));
      await syncEnrollmentCompletion('enr-r', 'stu', 'crs');
      // Load-bearing: status stays terminal (it flips to 'completed' on origin/main).
      expect(state.enrollment?.status).toBe(status);
    });

    it(`syncEnrollmentCompletion never resurrects a '${status}' zero-lesson enrolment (the total===0 admin path)`, async () => {
      seedEnrollment(status, new Date('2026-01-01T00:00:00.000Z'));
      state.lessonIds = []; // zero-lesson course: the total===0 branch runs
      await syncEnrollmentCompletion('enr-r', 'stu', 'crs');
      expect(state.enrollment?.status).toBe(status);
      expect(state.enrollment?.completedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it(`getEnrollmentForCertificate returns null for a '${status}' enrolment and does not flip it`, async () => {
      seedEnrollment(status, new Date('2026-01-01T00:00:00.000Z'));
      const cert = await getEnrollmentForCertificate('stu', 'enr-r');
      expect(cert).toBeNull();
      expect(state.enrollment?.status).toBe(status);
    });

    it(`getLessonContextForStudent denies a '${status}' enrolment (no paid content)`, async () => {
      seedEnrollment(status, new Date('2026-01-01T00:00:00.000Z'));
      seedLesson();
      const ctx = await getLessonContextForStudent('l1', 'stu');
      expect(ctx).toBeNull();
    });
  }
});

describe('WS3 markCertificateIssued — mint-time gate (WD)', () => {
  it('does NOT stamp certificateIssuedAt on a revoked enrolment (closes the revoke-vs-download race)', async () => {
    seedEnrollment('revoked', new Date('2026-01-01T00:00:00.000Z'));
    await markCertificateIssued('enr-r');
    expect(state.enrollment?.certificateIssuedAt).toBeNull();
  });

  it('DOES stamp a genuinely completed enrolment (positive control)', async () => {
    seedEnrollment('completed', new Date('2026-01-01T00:00:00.000Z'));
    await markCertificateIssued('enr-r');
    expect(state.enrollment?.certificateIssuedAt).not.toBeNull();
  });
});

describe('WS3 legit states still pass (no false-deny)', () => {
  it('a completed enrolment still receives its certificate', async () => {
    seedEnrollment('completed', new Date('2026-01-01T00:00:00.000Z'));
    const cert = await getEnrollmentForCertificate('stu', 'enr-r');
    expect(cert).not.toBeNull();
    expect(state.enrollment?.status).toBe('completed');
  });

  it('an active enrolment can still view lesson content', async () => {
    seedEnrollment('active', null);
    seedLesson();
    const ctx = await getLessonContextForStudent('l1', 'stu');
    expect(ctx).not.toBeNull();
  });

  it('an active enrolment that finishes all lessons still transitions to completed', async () => {
    seedEnrollment('active', null);
    await syncEnrollmentCompletion('enr-r', 'stu', 'crs');
    expect(state.enrollment?.status).toBe('completed');
  });
});
