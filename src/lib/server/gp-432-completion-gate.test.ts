import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-432: the server decides when an enrolment is complete, so a certificate cannot be
 * obtained without the assessment it depends on. One test per way in (audit 22/11/2026,
 * journey-checkout-security.md defect 3):
 *   1. a CEC-approved course with no assessment completed on lessons alone;
 *   2. the learner's browser could mark a quiz lesson complete with one PATCH;
 *   3. a published practical assessment never gated completion.
 * Each is checked against syncEnrollmentCompletion / patchLessonProgress, the single writer
 * of `status: 'completed'` for self-paced courses (certificate, credentials, proof pack and
 * the IICRC CEC auto-submit all read that status).
 */

type EnrollmentRow = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
  firstCompletedAt?: Date | null;
};

const CEC_SLUG = 'cec-approved-course';
const PLAIN_SLUG = 'non-cec-course';

const state = vi.hoisted(() => ({
  enrollment: null as EnrollmentRow | null,
  courseSlug: 'cec-approved-course',
  lessonIds: [] as string[],
  completedLessonCount: 0,
  quizzes: [] as { id: string }[],
  passedQuizIds: [] as string[],
  practicals: [] as { id: string }[],
  passedPracticalIds: [] as string[],
  lesson: null as null | { contentType: string; contentBody: string | null; resources: unknown },
  progressWrites: [] as Array<{ lessonId: string; completed: boolean }>,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: vi.fn(async () => ({
        slug: state.courseSlug,
        modules: [{ lessons: state.lessonIds.map((id) => ({ id })) }],
      })),
    },
    lmsLesson: {
      findUnique: vi.fn(async () => state.lesson),
    },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      findFirst: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Partial<EnrollmentRow> }) => {
        state.enrollment = { ...(state.enrollment as EnrollmentRow), ...args.data };
        return state.enrollment;
      }),
      updateMany: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = state.enrollment;
        if (!row || row.firstCompletedAt) return { count: 0 };
        state.enrollment = { ...row, ...args.data } as EnrollmentRow;
        return { count: 1 };
      }),
    },
    lmsLessonProgress: {
      count: vi.fn(async () => state.completedLessonCount),
      upsert: vi.fn(async (args: { where: { studentId_lessonId: { lessonId: string } }; update: { completed: boolean } }) => {
        state.progressWrites.push({
          lessonId: args.where.studentId_lessonId.lessonId,
          completed: args.update.completed,
        });
        return {};
      }),
    },
    lmsQuiz: {
      findMany: vi.fn(async () => state.quizzes),
    },
    lmsQuizAttempt: {
      findMany: vi.fn(async (args: { where: { quizId: { in: string[] } } }) =>
        state.passedQuizIds
          .filter((id) => args.where.quizId.in.includes(id))
          .map((quizId) => ({ quizId })),
      ),
      findFirst: vi.fn(async (args: { where: { quizId: string } }) =>
        state.passedQuizIds.includes(args.where.quizId) ? { id: 'attempt-1' } : null,
      ),
    },
    lmsPracticalAssessment: {
      findMany: vi.fn(async () => state.practicals),
    },
    lmsAssessmentSubmission: {
      findMany: vi.fn(async () =>
        state.passedPracticalIds.map((assessmentId) => ({ assessmentId })),
      ),
    },
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

// The CEC approvals registry is the only source of "is this a CEC course" (GP-498).
vi.mock('@/lib/server/course-cec-hours', () => ({
  resolveLmsCourseCecHours: (course: { slug: string }) => (course.slug === CEC_SLUG ? 4 : null),
}));

vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));

const service = await import('./enrollment-service');
const { syncEnrollmentCompletion, patchLessonProgress } = service;

function activeEnrollment(courseId: string): EnrollmentRow {
  return {
    id: 'enr-1',
    studentId: 'student-1',
    courseId,
    status: 'active',
    completedAt: null,
    certificateIssuedAt: null,
  };
}

function reset(overrides: Partial<typeof state> = {}) {
  state.enrollment = null;
  state.courseSlug = CEC_SLUG;
  state.lessonIds = [];
  state.completedLessonCount = 0;
  state.quizzes = [];
  state.passedQuizIds = [];
  state.practicals = [];
  state.passedPracticalIds = [];
  state.lesson = null;
  state.progressWrites = [];
  Object.assign(state, overrides);
}

beforeEach(() => {
  vi.clearAllMocks();
  reset();
});

describe('GP-432 path 1: a CEC course with no assessment cannot complete', () => {
  it('a CEC-approved course with no quiz and no practical stays active after every lesson is done', async () => {
    const { processIicrcCecSubmissionForEnrollment } = await import('@/lib/server/iicrc-cec-submission');
    reset({
      enrollment: activeEnrollment('course-cec'),
      courseSlug: CEC_SLUG,
      lessonIds: ['l1', 'l2'],
      completedLessonCount: 2,
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.completedAt).toBeNull();
    expect(processIicrcCecSubmissionForEnrollment).not.toHaveBeenCalled();
  });

  it('control: the same CEC course completes once it has a quiz the learner passed', async () => {
    reset({
      enrollment: activeEnrollment('course-cec'),
      courseSlug: CEC_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }],
      passedQuizIds: ['q1'],
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('completed');
  });

  it('control: a course with no CEC approval and no assessment still completes on lessons (no CEC is claimed)', async () => {
    reset({
      enrollment: activeEnrollment('course-plain'),
      courseSlug: PLAIN_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-plain');

    expect(state.enrollment?.status).toBe('completed');
  });

  it('an enrolment already completed before this change is never downgraded (GP-439 item 3: issued certificates are retained)', async () => {
    const done = new Date('2026-01-01T00:00:00Z');
    reset({
      enrollment: { ...activeEnrollment('course-cec'), status: 'completed', completedAt: done },
      courseSlug: CEC_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('completed');
    expect(state.enrollment?.completedAt).toEqual(done);
  });
});

describe('GP-432 path 2: the browser cannot mark a quiz lesson complete', () => {
  const QUIZ_ID = '20000000-0000-4000-8000-000000000001';

  it('refuses completed=true on a quiz lesson the learner has not passed, and writes no progress', async () => {
    reset({
      enrollment: activeEnrollment('course-plain'),
      courseSlug: PLAIN_SLUG,
      lessonIds: ['quiz-lesson'],
      lesson: { contentType: 'quiz', contentBody: QUIZ_ID, resources: null },
      quizzes: [{ id: QUIZ_ID }],
    });

    await expect(
      patchLessonProgress({
        studentId: 'student-1',
        lessonId: 'quiz-lesson',
        enrollmentId: 'enr-1',
        courseId: 'course-plain',
        completed: true,
      }),
    ).rejects.toMatchObject({ name: 'LessonCompletionEvidenceError' });
    expect(state.progressWrites).toEqual([]);
  });

  it('refuses a reading lesson whose resources attach an unpassed quiz', async () => {
    reset({
      enrollment: activeEnrollment('course-plain'),
      courseSlug: PLAIN_SLUG,
      lessonIds: ['reading-with-quiz'],
      lesson: { contentType: 'text', contentBody: 'Read this', resources: [{ url: `quiz:${QUIZ_ID}` }] },
      quizzes: [{ id: QUIZ_ID }],
    });

    await expect(
      patchLessonProgress({
        studentId: 'student-1',
        lessonId: 'reading-with-quiz',
        enrollmentId: 'enr-1',
        courseId: 'course-plain',
        completed: true,
      }),
    ).rejects.toMatchObject({ name: 'LessonCompletionEvidenceError' });
    expect(state.progressWrites).toEqual([]);
  });

  it('control: accepts the quiz lesson once the server holds a passed attempt', async () => {
    reset({
      enrollment: activeEnrollment('course-plain'),
      courseSlug: PLAIN_SLUG,
      lessonIds: ['quiz-lesson'],
      lesson: { contentType: 'quiz', contentBody: QUIZ_ID, resources: null },
      quizzes: [{ id: QUIZ_ID }],
      passedQuizIds: [QUIZ_ID],
    });

    await patchLessonProgress({
      studentId: 'student-1',
      lessonId: 'quiz-lesson',
      enrollmentId: 'enr-1',
      courseId: 'course-plain',
      completed: true,
    });

    expect(state.progressWrites).toEqual([{ lessonId: 'quiz-lesson', completed: true }]);
  });

  it('control: un-marking a quiz lesson needs no evidence', async () => {
    reset({
      enrollment: activeEnrollment('course-plain'),
      courseSlug: PLAIN_SLUG,
      lessonIds: ['quiz-lesson'],
      lesson: { contentType: 'quiz', contentBody: QUIZ_ID, resources: null },
    });

    await patchLessonProgress({
      studentId: 'student-1',
      lessonId: 'quiz-lesson',
      enrollmentId: 'enr-1',
      courseId: 'course-plain',
      completed: false,
    });

    expect(state.progressWrites).toEqual([{ lessonId: 'quiz-lesson', completed: false }]);
  });
});

describe('GP-432 path 3: a published practical assessment gates completion', () => {
  it('stays active while a published practical has no passed submission, even with every quiz passed', async () => {
    reset({
      enrollment: activeEnrollment('course-cec'),
      courseSlug: CEC_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }],
      passedQuizIds: ['q1'],
      practicals: [{ id: 'p1' }],
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('active');
  });

  it('control: completes once the practical submission has passed review', async () => {
    reset({
      enrollment: activeEnrollment('course-cec'),
      courseSlug: CEC_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
      quizzes: [{ id: 'q1' }],
      passedQuizIds: ['q1'],
      practicals: [{ id: 'p1' }],
      passedPracticalIds: ['p1'],
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('completed');
  });

  it('a passed practical alone counts as the assessment for a CEC course with no quiz', async () => {
    reset({
      enrollment: activeEnrollment('course-cec'),
      courseSlug: CEC_SLUG,
      lessonIds: ['l1'],
      completedLessonCount: 1,
      practicals: [{ id: 'p1' }],
      passedPracticalIds: ['p1'],
    });

    await syncEnrollmentCompletion('enr-1', 'student-1', 'course-cec');

    expect(state.enrollment?.status).toBe('completed');
  });
});

describe('GP-432 path 4b: one gated writer of a completed enrolment', () => {
  it('no code outside syncEnrollmentCompletion and the cohort attendance finalisation writes status completed', () => {
    // Allow-list: the admin manual IICRC send used to write `status: 'completed'` itself and so
    // skipped the assessment gate. Any new writer must go through syncEnrollmentCompletion.
    const root = join(__dirname, '..', '..', '..');
    const allowed = new Set([
      join('src', 'lib', 'server', 'ccw-attendance', 'provision.ts'), // cohort attendance (GP-736)
    ]);
    const writer = /lmsEnrollment\.(update|updateMany|upsert|create)\([\s\S]{0,400}?data:\s*\{[^}]*status:\s*'completed'/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
        const rel = relative(root, path);
        if (allowed.has(rel)) continue;
        if (writer.test(readFileSync(path, 'utf8'))) offenders.push(rel);
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'src'));
    expect(offenders).toEqual([]);
  });

  it('the guard pattern catches the old manual-send writer (positive control)', () => {
    const oldManualSend = `await prisma.$transaction(async (tx) => {
    await tx.lmsEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'completed',
        completedAt,
      },
    });`;
    expect(/lmsEnrollment\.(update|updateMany|upsert|create)\([\s\S]{0,400}?data:\s*\{[^}]*status:\s*'completed'/.test(oldManualSend)).toBe(true);
  });
});
