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
    // Row lock (enrollment-row-lock.ts): the sync reads the prior status after it, via findUnique.
    $queryRaw: async () => [{ id: "locked-row" }],
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

// ---------------------------------------------------------------------------------------------
// Path 4b: one gated writer of a completed enrolment.
//
// Design (after review found a ternary `status: done ? 'completed' : 'active'` slipping past a
// shape-matching regex): an ALLOW-LIST OF FILES, not a list of bad shapes. Every non-test file
// under app/ and src/ that writes lms_enrollments (Prisma or raw SQL) and whose write call
// mentions `completed` in any form, or sets `status` from anything but a string literal, is an
// offender unless it is named below with its reason. Inside enrollment-service.ts such a write
// is allowed only within syncEnrollmentCompletion.
// ---------------------------------------------------------------------------------------------

const ENROLMENT_WRITE = /lmsEnrollment\s*\.\s*(update|updateMany|upsert|create|createMany)\s*\(|\b(UPDATE|INSERT\s+INTO)\s+"?lms_enrollments\b/gi;

/** Text of the call starting at `start`: up to its balanced closing paren or template end. */
function callText(text: string, start: number): string {
  const open = text.indexOf('(', start);
  const tick = text.indexOf('`', start);
  if (tick !== -1 && (open === -1 || tick < open)) {
    // Raw SQL: the statement runs to the closing backtick.
    const end = text.indexOf('`', tick + 1);
    return text.slice(start, end === -1 ? undefined : end);
  }
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** The call with its filters removed: Prisma `where: {...}` objects and SQL WHERE tails. */
function withoutFilters(call: string): string {
  let out = call.replace(/\bWHERE\b[\s\S]*$/, '');
  for (;;) {
    const m = /\bwhere\s*:\s*\{/.exec(out);
    if (!m) return out;
    let depth = 0;
    let end = out.length;
    for (let i = m.index + m[0].length - 1; i < out.length; i += 1) {
      if (out[i] === '{') depth += 1;
      else if (out[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
}

/** Offsets of enrolment writes that can set `completed` (literally, by ternary or dynamically). */
function completedWriteOffsets(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(ENROLMENT_WRITE)) {
    const call = withoutFilters(callText(text, m.index ?? 0));
    const mentionsCompleted = /['"`]completed['"`]/.test(call);
    const dynamicStatus = /\bstatus\s*:\s*(?!['"`])[A-Za-z_$]/.test(call);
    const sqlSetsStatus = /\bstatus\s*=\s*(?!'(active|revoked|refunded|pending)')/i.test(call) && /lms_enrollments/i.test(call);
    if (mentionsCompleted || dynamicStatus || sqlSetsStatus) out.push(m.index ?? 0);
  }
  return out;
}

function functionSpan(text: string, name: string): [number, number] {
  const start = text.indexOf(`export async function ${name}(`);
  if (start === -1) return [-1, -1];
  const next = text.indexOf('\nexport ', start + 1);
  return [start, next === -1 ? text.length : next];
}

const COMPLETED_WRITER_ALLOW = new Map<string, string>([
  [join('src', 'lib', 'server', 'ccw-attendance', 'provision.ts'), 'cohort attendance finalisation (GP-736)'],
]);
const GATED_WRITER_FILE = join('src', 'lib', 'server', 'enrollment-service.ts');

function completedWriterOffenders(root: string): string[] {
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
      if (COMPLETED_WRITER_ALLOW.has(rel)) continue;
      const text = readFileSync(path, 'utf8');
      const offsets = completedWriteOffsets(text);
      if (offsets.length === 0) continue;
      if (rel === GATED_WRITER_FILE) {
        const [s, e] = functionSpan(text, 'syncEnrollmentCompletion');
        for (const o of offsets) if (o < s || o >= e) offenders.push(`${rel}@${o}`);
        continue;
      }
      offenders.push(rel);
    }
  };
  walk(join(root, 'app'));
  walk(join(root, 'src'));
  return offenders;
}

// ---------------------------------------------------------------------------------------------
// Design guard for the revoked-state kind (GP-432 verdict rounds 1 and 2: a status decision made
// from a read that a revocation could overtake). Every write that sets an enrolment's STATUS, in
// any file, must be listed here with how it stays safe against a concurrent revocation:
//   locks    - its function takes the enrolment row lock (enrollment-row-lock.ts) before it;
//   guarded  - one statement whose own filter names the status it moves from (the database
//              re-checks it atomically, so nothing read earlier can be stale);
//   new-row  - a create, or the create half of an upsert with an empty update;
//   limit    - a stated limit, with the reason it is outside GP-432.
// An unlisted status writer, or a listing that no longer matches the code, fails.
// ---------------------------------------------------------------------------------------------

type StatusWriterHow = 'locks' | 'guarded' | 'new-row' | 'limit';
const STATUS_WRITER_ALLOW = new Map<string, StatusWriterHow>([
  [`${join('src', 'lib', 'server', 'enrollment-service.ts')}#syncEnrollmentCompletion`, 'locks'],
  [`${join('src', 'lib', 'admin', 'admin-enrollment-mutations.ts')}#adminRevokeEnrollment`, 'locks'],
  // The revocation itself: one updateMany whose status filter is built in `statusCondition`
  // (out of the scan's sight). It is what the other writers must not overwrite.
  [`${join('src', 'lib', 'server', 'stripe-revocation.ts')}#revokeEnrollmentsByPaymentReference`, 'limit'],
  [`${join('src', 'lib', 'server', 'stripe-revocation.ts')}#reactivateDisputeWonEnrollmentsByPaymentReference`, 'guarded'],
  [`${join('src', 'lib', 'server', 'ccw-attendance', 'provision.ts')}#finalizeAttendanceForSignIn`, 'guarded'],
  // Re-purchase after a refund: runs only after a verified payment and sets 'active', which is
  // the intended result whatever the row held; unchanged by GP-432.
  [`${join('src', 'lib', 'server', 'enrollment-service.ts')}#enrollStudentInCourse`, 'limit'],
  [`${join('src', 'lib', 'server', 'enrollment-service.ts')}#ensureAdminEnrollmentForCourse`, 'new-row'],
  [`${join('src', 'lib', 'admin', 'admin-enrollment-mutations.ts')}#adminGrantEnrollment`, 'new-row'],
]);

const FUNCTION_DECL = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*[<(]/g;

function enclosingFunction(text: string, offset: number): { name: string; start: number } {
  let found = { name: '<module>', start: 0 };
  for (const m of text.matchAll(FUNCTION_DECL)) {
    if ((m.index ?? 0) > offset) break;
    found = { name: m[1]!, start: m.index ?? 0 };
  }
  return found;
}

/** Each enrolment write in `text` that sets status, with its function and how it is safe. */
function statusWrites(text: string): { fn: string; how: StatusWriterHow | 'unsafe' }[] {
  const out: { fn: string; how: StatusWriterHow | 'unsafe' }[] = [];
  for (const m of text.matchAll(ENROLMENT_WRITE)) {
    const at = m.index ?? 0;
    const call = callText(text, at);
    const data = withoutFilters(call);
    const setsStatus = /\bstatus\s*:/.test(data) || /\bSET\b[\s\S]*\bstatus\s*=/i.test(data);
    if (!setsStatus) continue;
    const { name, start } = enclosingFunction(text, at);
    const before = text.slice(start, at);
    const isNewRow =
      /\.\s*(create|createMany)\s*\(|INSERT\s+INTO/i.test(m[0]) ||
      (/\.\s*upsert\s*\(/.test(m[0]) && /\bupdate\s*:\s*\{\s*\}/.test(call));
    let how: StatusWriterHow | 'unsafe' = 'unsafe';
    if (isNewRow) how = 'new-row';
    else if (/\block(EnrollmentRow|EnrollmentForAdminChange)\s*\(/.test(before)) how = 'locks';
    else if (/\.\s*updateMany\s*\(/.test(m[0]) && /\bwhere\s*:\s*\{[\s\S]*\bstatus\b/.test(call)) how = 'guarded';
    else if (/^UPDATE/i.test(m[0]) && /\bWHERE\b[\s\S]*\bstatus\b/i.test(call)) how = 'guarded';
    out.push({ fn: name, how });
  }
  return out;
}

function statusWriterProblems(root: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
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
      const text = readFileSync(path, 'utf8');
      for (const w of statusWrites(text)) {
        const key = `${rel}#${w.fn}`;
        seen.add(key);
        const listed = STATUS_WRITER_ALLOW.get(key);
        if (!listed) problems.push(`unlisted status writer ${key} (${w.how})`);
        else if (listed !== 'limit' && listed !== w.how) problems.push(`${key} listed ${listed}, found ${w.how}`);
      }
    }
  };
  walk(join(root, 'app'));
  walk(join(root, 'src'));
  for (const key of STATUS_WRITER_ALLOW.keys()) if (!seen.has(key)) problems.push(`stale listing ${key}`);
  return problems;
}

describe('GP-432 design guard: every enrolment status writer is safe against a revocation', () => {
  const root = join(__dirname, '..', '..', '..');

  it('every status writer is listed, and each listing matches the code', () => {
    expect(statusWriterProblems(root)).toEqual([]);
  });

  it('positive control: a read-then-write status change with no lock is unsafe', () => {
    const src = `export async function planted(id: string) {
      const row = await prisma.lmsEnrollment.findUnique({ where: { id } });
      if (row?.status === 'active') await prisma.lmsEnrollment.update({ where: { id }, data: { status: 'completed' } });
    }`;
    expect(statusWrites(src)).toEqual([{ fn: 'planted', how: 'unsafe' }]);
  });

  it('positive control: a status filter on a single-row update by id alone does not count as guarded', () => {
    const src = `export async function planted(id: string) {
      await prisma.lmsEnrollment.update({ where: { id }, data: { status: 'active' } });
    }`;
    expect(statusWrites(src)).toEqual([{ fn: 'planted', how: 'unsafe' }]);
  });

  it('negative controls: a locked write, a guarded updateMany and a raw guarded UPDATE are recognised', () => {
    const src = `export async function a(tx, id) {
      await lockEnrollmentRow(tx, id);
      await tx.lmsEnrollment.update({ where: { id }, data: { status: 'active' } });
    }
    export async function b(id) {
      await prisma.lmsEnrollment.updateMany({ where: { id, status: 'active' }, data: { status: 'revoked' } });
    }
    export async function c(tx, id) {
      await tx.$executeRaw\`UPDATE lms_enrollments SET status = 'revoked' WHERE id = \${id}::uuid AND status = 'active'\`;
    }`;
    expect(statusWrites(src)).toEqual([
      { fn: 'a', how: 'locks' },
      { fn: 'b', how: 'guarded' },
      { fn: 'c', how: 'guarded' },
    ]);
  });
});

describe('GP-432 path 4b: one gated writer of a completed enrolment', () => {
  const root = join(__dirname, '..', '..', '..');

  it('no code outside syncEnrollmentCompletion and the allow-listed files can write a completed enrolment', () => {
    expect(completedWriterOffenders(root)).toEqual([]);
  });

  // Design guard (GP-432 verdict rounds 1 and 2 found the same kind twice: a revoked-status
  // decision made from a read that a revocation could overtake). Every writer of one learner's
  // enrolment record takes the row lock (enrollment-row-lock.ts) before its first write.
  it.each([
    [GATED_WRITER_FILE, 'syncEnrollmentCompletion', 'lockEnrollmentRow('],
    [GATED_WRITER_FILE, 'forceCompleteEnrollment', 'lockEnrollmentForAdminChange('],
    [join('src', 'lib', 'server', 'quiz-attempt-reset.ts'), 'resetQuizAttemptsForEnrollment', 'lockEnrollmentForAdminChange('],
    [join('src', 'lib', 'admin', 'admin-enrollment-mutations.ts'), 'adminRevokeEnrollment', 'lockEnrollmentRow('],
  ])('%s %s takes the enrolment row lock before its first write', (file, fn, lockCall) => {
    const text = readFileSync(join(root, file), 'utf8');
    const [s, e] = functionSpan(text, fn);
    expect(s, `${fn} not found`).toBeGreaterThan(-1);
    const body = text.slice(s, e);
    const lockAt = body.indexOf(lockCall);
    const firstWrite = body.search(
      /\.\s*(lmsEnrollment|lmsLessonProgress|lmsQuizAttempt|lmsLearnerAdminAuditEvent)\s*\.\s*(update|updateMany|upsert|create|createMany|delete|deleteMany)\s*\(/,
    );
    expect(lockAt, `${fn} does not call ${lockCall}`).toBeGreaterThan(-1);
    expect(firstWrite, `${fn} has no write to guard`).toBeGreaterThan(-1);
    expect(lockAt).toBeLessThan(firstWrite);
  });

  it('the gated writer itself is still found (the scan is not blind)', () => {
    const text = readFileSync(join(root, GATED_WRITER_FILE), 'utf8');
    const [s, e] = functionSpan(text, 'syncEnrollmentCompletion');
    expect(s).toBeGreaterThan(-1);
    expect(completedWriteOffsets(text).some((o) => o >= s && o < e)).toBe(true);
  });

  it.each([
    ['literal', `await tx.lmsEnrollment.update({ where: { id }, data: { status: 'completed', completedAt } });`],
    ['ternary', `await prisma.lmsEnrollment.update({ where: { id }, data: { status: done ? 'completed' : 'active' } });`],
    ['variable', `const next = 'completed';\nawait prisma.lmsEnrollment.updateMany({ where: { id }, data: { status: next } });`],
    ['spaced call', `await prisma.lmsEnrollment . upsert ({ where: { id }, create: { status: "completed" }, update: {} });`],
    ['raw SQL', "await tx.$executeRaw`UPDATE lms_enrollments SET status = 'completed', completed_at = NOW() WHERE id = ${id}::uuid`;"],
    ['raw SQL parameter', "await tx.$executeRaw`UPDATE lms_enrollments SET status = ${s} WHERE id = ${id}::uuid`;"],
  ])('positive control: the scan flags a %s completed write', (_label, src) => {
    expect(completedWriteOffsets(src).length).toBeGreaterThan(0);
  });

  it.each([
    ['revocation', `await prisma.lmsEnrollment.update({ where: { id }, data: { status: 'revoked', completedAt: null } });`],
    ['certificate stamp', `await prisma.lmsEnrollment.update({ where: { id }, data: { certificateIssuedAt: new Date() } });`],
    ['filter on completed', `await prisma.lmsEnrollment.updateMany({ where: { id, status: 'completed' }, data: { certificateIssuedAt: new Date() } });`],
    ['SQL filter on completed', "await tx.$executeRaw`UPDATE lms_enrollments SET certificate_issued_at = NOW() WHERE status = 'completed'`;"],
  ])('negative control: the scan leaves a %s write alone', (_label, src) => {
    expect(completedWriteOffsets(src)).toEqual([]);
  });
});
