/**
 * GP-737 staff auto-enrolment on a REAL PostgreSQL (real Prisma, real SQL).
 *
 * Proves, against the migrated schema:
 *   (1) an allow-listed instructor's first visit to a workshop quiz creates their staff
 *       enrolment (ensureStaffEnrollmentForQuiz), so the quiz routes no longer refuse them;
 *   (2) an instructor whose own workshop row is `revoked` is reactivated as a staff enrolment
 *       (the old `update: {}` upsert left it revoked: lesson 404, curriculum 403), while a
 *       revoked LEARNER row on the same course stays revoked.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service,
 * before any seeding. It needs a LOCAL, migrated, disposable database and refuses anything
 * else (src/test-utils/pg-disposable.ts). Locally without DATABASE_URL it is skipped.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;
const WORKSHOP_SLUG = 'ccw-2-day-workshop';

if (!RUNNABLE) {
  describe('staff auto-enrolment (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('staff auto-enrolment (real PostgreSQL, GP-737)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let service: typeof import('./enrollment-service');
  const db = new pg.Client({ connectionString: DB_URL });
  let ids: {
    instructor: string;
    learner: string;
    owner: string;
    course: string;
    module: string;
    lesson: string;
    quiz: string;
  };

  const instructor = (): SessionClaims => ({
    sub: ids.instructor,
    email: `inst-${ids.instructor}@staff-test.invalid`,
    full_name: 'Instructor',
    role: 'instructor',
  });
  const learner = (): SessionClaims => ({
    sub: ids.learner,
    email: `learner-${ids.learner}@staff-test.invalid`,
    full_name: 'Learner',
    role: 'student',
  });

  async function statusOf(
    studentId: string
  ): Promise<{ status: string; ref: string | null } | null> {
    const r = await db.query<{ status: string; ref: string | null }>(
      'SELECT status, payment_reference AS ref FROM lms_enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, ids.course]
    );
    return r.rows[0] ?? null;
  }

  async function insertRevoked(studentId: string): Promise<void> {
    await db.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status, payment_reference) VALUES ($1, $2, $3, 'revoked', 'cs_test_refunded')",
      [randomUUID(), studentId, ids.course]
    );
  }

  beforeAll(async () => {
    await db.connect();
    // The instructor allow-list is keyed on the real workshop slug, which is unique: refuse a
    // database that already holds that course rather than touch it.
    const n = await db.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM lms_courses WHERE slug = $1',
      [WORKSHOP_SLUG]
    );
    if (n.rows[0]!.n !== 0)
      throw new Error(
        `staff-autoenrol.pg.test needs a database without a ${WORKSHOP_SLUG} course.`
      );
    ({ prisma } = await import('@/lib/prisma'));
    service = await import('./enrollment-service');
  });

  afterAll(async () => {
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
  });

  beforeEach(async () => {
    ids = {
      instructor: randomUUID(),
      learner: randomUUID(),
      owner: randomUUID(),
      course: randomUUID(),
      module: randomUUID(),
      lesson: randomUUID(),
      quiz: randomUUID(),
    };
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, 'x'), ($3, $4, 'x'), ($5, $6, 'x')",
      [
        ids.instructor,
        instructor().email,
        ids.learner,
        learner().email,
        ids.owner,
        `owner-${ids.owner}@staff-test.invalid`,
      ]
    );
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Workshop', $3, 'published', 0)",
      [ids.course, WORKSHOP_SLUG, ids.owner]
    );
    await db.query(
      "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'Day 1', 0)",
      [ids.module, ids.course]
    );
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, order_index) VALUES ($1, $2, 'Lesson', 'text', 0)",
      [ids.lesson, ids.module]
    );
    await db.query("INSERT INTO lms_quizzes (id, course_id, title) VALUES ($1, $2, 'Check')", [
      ids.quiz,
      ids.course,
    ]);
  });

  afterEach(async () => {
    await db.query('DELETE FROM lms_enrollments WHERE course_id = $1', [ids.course]);
    await db.query('DELETE FROM lms_quizzes WHERE course_id = $1', [ids.course]);
    await db.query('DELETE FROM lms_lessons WHERE module_id = $1', [ids.module]);
    await db.query('DELETE FROM lms_modules WHERE course_id = $1', [ids.course]);
    await db.query('DELETE FROM lms_courses WHERE id = $1', [ids.course]);
    await db.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [
      [ids.instructor, ids.learner, ids.owner],
    ]);
  });

  it('(1) enrols an instructor whose first visit is a workshop quiz', async () => {
    await service.ensureStaffEnrollmentForQuiz(instructor(), ids.quiz);
    expect(await statusOf(ids.instructor)).toEqual({
      status: 'active',
      ref: service.ADMIN_ACCESS_PAYMENT_REFERENCE,
    });
  });

  it('(2) reactivates an instructor whose own workshop row is revoked', async () => {
    await insertRevoked(ids.instructor);

    await service.ensureStaffEnrollmentForLesson(instructor(), ids.lesson);

    expect(await statusOf(ids.instructor)).toEqual({
      status: 'active',
      ref: service.ADMIN_ACCESS_PAYMENT_REFERENCE,
    });
    expect(await service.getLessonContextForStudent(ids.lesson, ids.instructor)).not.toBeNull();
  });

  it('(2) leaves a revoked learner row revoked: a refund still shuts the learner out', async () => {
    await insertRevoked(ids.learner);

    await service.ensureStaffEnrollmentForLesson(learner(), ids.lesson);
    await service.ensureStaffEnrollmentForQuiz(learner(), ids.quiz);

    expect(await statusOf(ids.learner)).toEqual({ status: 'revoked', ref: 'cs_test_refunded' });
    expect(await service.getLessonContextForStudent(ids.lesson, ids.learner)).toBeNull();
  });
});
