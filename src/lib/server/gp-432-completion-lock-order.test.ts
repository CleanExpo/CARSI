import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-432 (69b54a55 review, P1): completion is decided only from evidence read under the
 * enrolment row lock, and a lesson mark or un-mark is written under the same lock.
 *
 * If syncEnrollmentCompletion read the lesson count and the assessment results before taking
 * the lock, a learner's un-mark could commit while the sync waited, and the sync would still
 * write `completed` (and start the IICRC CEC auto-submit) from the stale read. These tests
 * record the order of database calls and fail if any evidence read comes before the lock, or
 * if a lesson-progress write is not inside a transaction that took the lock first. The real
 * two-connection race is in gp-432-learner-record.pg.test.ts.
 */

const calls = vi.hoisted(() => [] as string[]);
const state = vi.hoisted(() => ({ inTx: false }));

function rec(name: string) {
  return vi.fn(async (...args: unknown[]) => {
    calls.push(`${state.inTx ? 'tx' : 'top'}:${name}`);
    return RESULTS[name]?.(...args);
  });
}

const RESULTS: Record<string, (...args: unknown[]) => unknown> = {
  'lmsCourse.findUnique': () => ({ slug: 'plain-course', modules: [{ lessons: [{ id: 'l1' }] }] }),
  'lmsLesson.findUnique': () => ({ contentType: 'text', contentBody: 'Body', resources: null }),
  'lmsEnrollment.findUnique': () => ({ status: 'active', completedAt: null }),
  'lmsEnrollment.update': () => ({}),
  'lmsEnrollment.updateMany': () => ({ count: 1 }),
  'lmsLessonProgress.count': () => 1,
  'lmsLessonProgress.upsert': () => ({}),
  'lmsQuiz.findMany': () => [{ id: 'q1' }],
  'lmsQuizAttempt.findMany': () => [{ quizId: 'q1' }],
  'lmsPracticalAssessment.findMany': () => [],
  'lmsAssessmentSubmission.findMany': () => [],
  $queryRaw: () => [{ id: 'e1', studentId: 's1', courseId: 'c1', status: 'active' }],
};

vi.mock('@/lib/prisma', () => {
  const client = {
    lmsCourse: { findUnique: rec('lmsCourse.findUnique') },
    lmsLesson: { findUnique: rec('lmsLesson.findUnique') },
    lmsEnrollment: {
      findUnique: rec('lmsEnrollment.findUnique'),
      update: rec('lmsEnrollment.update'),
      updateMany: rec('lmsEnrollment.updateMany'),
    },
    lmsLessonProgress: { count: rec('lmsLessonProgress.count'), upsert: rec('lmsLessonProgress.upsert') },
    lmsQuiz: { findMany: rec('lmsQuiz.findMany') },
    lmsQuizAttempt: { findMany: rec('lmsQuizAttempt.findMany') },
    lmsPracticalAssessment: { findMany: rec('lmsPracticalAssessment.findMany') },
    lmsAssessmentSubmission: { findMany: rec('lmsAssessmentSubmission.findMany') },
    // SELECT ... FOR UPDATE in enrollment-row-lock.ts
    $queryRaw: rec('$queryRaw'),
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      state.inTx = true;
      calls.push('begin');
      try {
        return await fn(client);
      } finally {
        calls.push('commit');
        state.inTx = false;
      }
    },
  };
  return { prisma: client };
});

const iicrc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/server/iicrc-cec-submission', () => ({ processIicrcCecSubmissionForEnrollment: iicrc }));
vi.mock('@/lib/server/course-cec-hours', () => ({ resolveLmsCourseCecHours: () => null }));

const { syncEnrollmentCompletion, patchLessonProgress } = await import('./enrollment-service');

const EVIDENCE = [
  'lmsLessonProgress.count',
  'lmsQuiz.findMany',
  'lmsQuizAttempt.findMany',
  'lmsPracticalAssessment.findMany',
  'lmsAssessmentSubmission.findMany',
];

beforeEach(() => {
  calls.length = 0;
  iicrc.mockClear();
});

describe('GP-432: completion is decided from evidence read under the enrolment row lock', () => {
  it('syncEnrollmentCompletion takes the lock before reading any learner evidence, all in one transaction', async () => {
    await syncEnrollmentCompletion('e1', 's1', 'c1');

    const lock = calls.indexOf('tx:$queryRaw');
    expect(lock).toBeGreaterThan(-1);
    const evidence = calls.filter((c) => EVIDENCE.some((e) => c.endsWith(`:${e}`)));
    expect(evidence.length).toBeGreaterThan(0);
    for (const read of evidence) {
      expect(read.startsWith('tx:'), `${read} must run inside the locked transaction`).toBe(true);
      expect(calls.indexOf(read), `${read} must come after the lock`).toBeGreaterThan(lock);
    }
    // The decision is written in the same transaction, before it commits.
    const write = calls.indexOf('tx:lmsEnrollment.update');
    expect(write).toBeGreaterThan(lock);
    expect(write).toBeLessThan(calls.indexOf('commit'));
  });

  it('the IICRC auto-submit starts only after the transaction that set completed has committed', async () => {
    let committedBeforeSubmit = false;
    iicrc.mockImplementationOnce(async () => {
      committedBeforeSubmit = calls.includes('commit');
    });
    await syncEnrollmentCompletion('e1', 's1', 'c1');
    await vi.waitFor(() => expect(iicrc).toHaveBeenCalledTimes(1));
    expect(committedBeforeSubmit).toBe(true);
  });

  it('a lesson un-mark writes progress inside a transaction that took the enrolment lock first', async () => {
    await patchLessonProgress({ studentId: 's1', lessonId: 'l1', enrollmentId: 'e1', courseId: 'c1', completed: false });

    const firstCommit = calls.indexOf('commit');
    const lock = calls.indexOf('tx:$queryRaw');
    const upsert = calls.indexOf('tx:lmsLessonProgress.upsert');
    expect(calls).not.toContain('top:lmsLessonProgress.upsert');
    expect(lock).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(lock);
    expect(upsert).toBeLessThan(firstCommit);
  });
});
