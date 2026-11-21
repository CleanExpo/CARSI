/**
 * GP-432 on a REAL PostgreSQL: the migration, the assessment gate, the audited admin
 * force-complete and the audited quiz-attempt reset, through the real service code and SQL.
 *
 * Proves:
 *   - a course in the CEC approvals registry with no assessment does not complete on lessons
 *     alone, and completes once it has a quiz the learner passed;
 *   - admin force-complete marks lessons, writes an audit row naming the admin and the reason,
 *     and does not complete an enrolment whose quiz is unpassed;
 *   - an admin quiz-attempt reset voids failed attempts (kept on record), leaves a passed attempt,
 *     drops the counted attempts to zero and writes one audit row;
 *   - the database refuses an audit row with a blank reason (CHECK constraint).
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service.
 * It needs a disposable loopback database (src/test-utils/pg-disposable.ts); locally it skips.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

// A slug that IS in data/seed/cec-approvals.json with status 'approved' (registry, GP-498).
const CEC_SLUG = 'introduction-to-porous-materials-drying';
const BOOTSTRAP_ADMIN = 'gp432-bootstrap-admin@pg-test.invalid';

if (!RUNNABLE) {
  describe('GP-432 learner record (real PostgreSQL)', () => {
    const refusal = TARGET.refusal;
    if (refusal) {
      it('refuses: needs a disposable loopback DATABASE_URL (CARSI_PG_DISPOSABLE=1)', () => {
        throw new Error(refusal);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('GP-432 learner record (real PostgreSQL)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let service: typeof import('./enrollment-service');
  let reset: typeof import('./quiz-attempt-reset');
  let counter: typeof import('./quiz-attempt-count');
  const db = new pg.Client({ connectionString: DB_URL });
  let ids: {
    learner: string;
    instructor: string;
    course: string;
    module: string;
    lesson: string;
    enrolment: string;
    quiz: string;
    otherQuiz: string;
  };
  const session = { via: 'admin_cookie' as const, email: BOOTSTRAP_ADMIN };

  beforeAll(async () => {
    vi.stubEnv('ADMIN_EMAIL', BOOTSTRAP_ADMIN);
    await db.connect();
    ({ prisma } = await import('@/lib/prisma'));
    service = await import('./enrollment-service');
    reset = await import('./quiz-attempt-reset');
    counter = await import('./quiz-attempt-count');
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
  });

  beforeEach(async () => {
    ids = {
      learner: randomUUID(),
      instructor: randomUUID(),
      course: randomUUID(),
      module: randomUUID(),
      lesson: randomUUID(),
      enrolment: randomUUID(),
      quiz: randomUUID(),
      otherQuiz: randomUUID(),
    };
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password, role) VALUES ($1, $2, 'x', NULL), ($3, $4, 'x', NULL)",
      [ids.learner, `learner-${ids.learner}@pg-test.invalid`, ids.instructor, `inst-${ids.instructor}@pg-test.invalid`],
    );
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'GP-432 test', $3, 'published', 0)",
      [ids.course, CEC_SLUG, ids.instructor],
    );
    await db.query(
      "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'M1', 0)",
      [ids.module, ids.course],
    );
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, content_body, order_index) VALUES ($1, $2, 'Reading', 'text', 'Body', 0)",
      [ids.lesson, ids.module],
    );
    await db.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status) VALUES ($1, $2, $3, 'active')",
      [ids.enrolment, ids.learner, ids.course],
    );
  });

  afterEach(async () => {
    await db.query('DELETE FROM lms_learner_admin_audit_events WHERE student_ref = $1', [ids.learner]);
    await db.query('DELETE FROM lms_iicrc_cec_submissions WHERE enrollment_id = $1', [ids.enrolment]).catch(() => {});
    await db.query('DELETE FROM lms_courses WHERE id = $1', [ids.course]);
    await db.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [[ids.learner, ids.instructor]]);
  });

  async function status(): Promise<string> {
    const r = await db.query<{ status: string }>('SELECT status FROM lms_enrollments WHERE id = $1', [ids.enrolment]);
    return r.rows[0]!.status;
  }

  async function addQuiz(id: string) {
    await db.query("INSERT INTO lms_quizzes (id, course_id, title) VALUES ($1, $2, 'Check')", [id, ids.course]);
  }

  async function addAttempt(quizId: string, passed: boolean) {
    await db.query(
      "INSERT INTO lms_quiz_attempts (id, quiz_id, student_id, score_percent, passed, answers) VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)",
      [randomUUID(), quizId, ids.learner, passed ? 100 : 10, passed],
    );
  }

  it('a CEC-approved course with no assessment does not complete on lessons alone; a passed quiz completes it', async () => {
    await db.query(
      'INSERT INTO lms_lesson_progress (id, student_id, lesson_id, completed, completed_at) VALUES ($1, $2, $3, TRUE, now())',
      [randomUUID(), ids.learner, ids.lesson],
    );
    await service.syncEnrollmentCompletion(ids.enrolment, ids.learner, ids.course, { skipIicrcAutoSubmit: true });
    expect(await status()).toBe('active');

    await addQuiz(ids.quiz);
    await addAttempt(ids.quiz, true);
    await service.syncEnrollmentCompletion(ids.enrolment, ids.learner, ids.course, { skipIicrcAutoSubmit: true });
    expect(await status()).toBe('completed');
  });

  it('admin force-complete marks lessons and writes an audit row, but an unpassed quiz keeps the enrolment active', async () => {
    await addQuiz(ids.quiz);
    const result = await service.forceCompleteEnrollment(ids.enrolment, ids.learner, {
      session,
      reason: 'Lesson pages failed to record',
    });
    expect(result).toEqual({ lessonsMarked: 1, completed: false });
    expect(await status()).toBe('active');
    const progress = await db.query<{ completed: boolean }>(
      'SELECT completed FROM lms_lesson_progress WHERE student_id = $1 AND lesson_id = $2',
      [ids.learner, ids.lesson],
    );
    expect(progress.rows[0]!.completed).toBe(true);
    const audit = await db.query(
      'SELECT action, reason, actor_kind, actor_ref, actor_email, enrollment_ref, course_ref FROM lms_learner_admin_audit_events WHERE student_ref = $1',
      [ids.learner],
    );
    expect(audit.rows).toEqual([
      {
        action: 'force_complete',
        reason: 'Lesson pages failed to record',
        actor_kind: 'bootstrap_admin',
        actor_ref: null,
        actor_email: BOOTSTRAP_ADMIN,
        enrollment_ref: ids.enrolment,
        course_ref: ids.course,
      },
    ]);
  });

  it('quiz-attempt reset voids failed attempts, keeps the passed one, frees the attempt limit and audits it', async () => {
    await addQuiz(ids.quiz);
    await addQuiz(ids.otherQuiz);
    for (let i = 0; i < 3; i += 1) await addAttempt(ids.quiz, false);
    await addAttempt(ids.otherQuiz, true);
    expect(await counter.countCountedQuizAttempts(prisma, ids.quiz, ids.learner)).toBe(3);

    const result = await reset.resetQuizAttemptsForEnrollment({
      enrollmentId: ids.enrolment,
      session,
      reason: 'Reviewed the material with the learner',
    });

    expect(result.voided).toBe(3);
    expect(await counter.countCountedQuizAttempts(prisma, ids.quiz, ids.learner)).toBe(0);
    expect(await counter.countCountedQuizAttempts(prisma, ids.otherQuiz, ids.learner)).toBe(1);
    const kept = await db.query<{ n: number; voided: number }>(
      'SELECT count(*)::int AS n, count(voided_at)::int AS voided FROM lms_quiz_attempts WHERE student_id = $1',
      [ids.learner],
    );
    expect(kept.rows[0]).toEqual({ n: 4, voided: 3 });
    const audit = await db.query<{ action: string; reason: string; details: { voidedAttemptIds: string[] } }>(
      'SELECT action, reason, details FROM lms_learner_admin_audit_events WHERE student_ref = $1',
      [ids.learner],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]!.action).toBe('quiz_attempts_reset');
    expect(audit.rows[0]!.details.voidedAttemptIds).toHaveLength(3);
  });

  it('the database refuses an audit row with a blank reason', async () => {
    await expect(
      db.query(
        "INSERT INTO lms_learner_admin_audit_events (id, action, reason, actor_kind, actor_ref, actor_email, student_ref) VALUES ($1, 'force_complete', '   ', 'bootstrap_admin', NULL, 'a@b.invalid', $2)",
        [randomUUID(), ids.learner],
      ),
    ).rejects.toThrow(/ck_lms_learner_admin_audit_reason/);
  });
});
