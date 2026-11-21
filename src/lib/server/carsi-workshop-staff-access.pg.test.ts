/**
 * GP-737 (GP-736 review P2s): staff access to the CARSI 2-day workshop on a REAL PostgreSQL.
 *
 * Runs the real route handlers (real Prisma, real SQL). Proves:
 *   1. An allow-listed instructor (and an admin) who opens a knowledge check BEFORE any lesson is
 *      auto-enrolled by the checkpoint and quiz routes, the same rule as the lesson GET, instead
 *      of getting 404/403. An instructor on a course outside the allow-list still gets nothing.
 *   2. A REVOKED staff row is a deliberate lock-out: staff auto-enrolment never reactivates it,
 *      and every workshop route denies it, including the participant and instructor manuals,
 *      which previously let any staff role through whatever the row said.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. It
 * needs a LOCAL, migrated, disposable database and refuses anything else (pg-disposable.ts).
 */
import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;
const WORKSHOP_SLUG = 'ccw-2-day-workshop';

if (!RUNNABLE) {
  describe('workshop staff access (real PostgreSQL)', () => {
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

type RouteCtx<P> = { params: Promise<P> };

describe.runIf(RUNNABLE)('workshop staff access (real PostgreSQL)', () => {
  // The checkpoint's content version is an HMAC that needs a strong secret.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'gp-737-pg-test-only-jwt-secret-0123456789abcdef';
  }
  const db = new pg.Client({ connectionString: DB_URL });
  let prisma: typeof import('@/lib/prisma').prisma;
  let signSessionToken: typeof import('@/lib/auth/session-jwt').signSessionToken;
  let routes: {
    lesson: typeof import('../../../app/api/lms/lessons/[lessonId]/route').GET;
    checkpoint: typeof import('../../../app/api/lms/lessons/[lessonId]/checkpoint/route').GET;
    curriculum: typeof import('../../../app/api/lms/courses/[slug]/curriculum/route').GET;
    quiz: typeof import('../../../app/api/lms/quizzes/[quizId]/route').GET;
    attempt: typeof import('../../../app/api/lms/quizzes/[quizId]/attempt/route').POST;
    participantManual: typeof import('../../../app/api/lms/workshops/carpet-cleaning/participant-manual/route').GET;
    instructorManual: typeof import('../../../app/api/lms/workshops/carpet-cleaning/instructor-manual/route').GET;
  };
  let ids: {
    instructor: string;
    admin: string;
    owner: string;
    course: string;
    otherCourse: string;
    module: string;
    otherModule: string;
    textLesson: string;
    quizLesson: string;
    quiz: string;
    otherQuiz: string;
    question: string;
  };

  beforeAll(async () => {
    await db.connect();
    const taken = await db.query('SELECT 1 FROM lms_courses WHERE slug = $1', [WORKSHOP_SLUG]);
    if (taken.rows.length)
      throw new Error(`carsi-workshop-staff-access.pg.test needs a database without a ${WORKSHOP_SLUG} course.`);
    ({ prisma } = await import('@/lib/prisma'));
    ({ signSessionToken } = await import('@/lib/auth/session-jwt'));
    routes = {
      lesson: (await import('../../../app/api/lms/lessons/[lessonId]/route')).GET,
      checkpoint: (await import('../../../app/api/lms/lessons/[lessonId]/checkpoint/route')).GET,
      curriculum: (await import('../../../app/api/lms/courses/[slug]/curriculum/route')).GET,
      quiz: (await import('../../../app/api/lms/quizzes/[quizId]/route')).GET,
      attempt: (await import('../../../app/api/lms/quizzes/[quizId]/attempt/route')).POST,
      participantManual: (await import('../../../app/api/lms/workshops/carpet-cleaning/participant-manual/route')).GET,
      instructorManual: (await import('../../../app/api/lms/workshops/carpet-cleaning/instructor-manual/route')).GET,
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
  });

  beforeEach(async () => {
    ids = {
      instructor: randomUUID(),
      admin: randomUUID(),
      owner: randomUUID(),
      course: randomUUID(),
      otherCourse: randomUUID(),
      module: randomUUID(),
      otherModule: randomUUID(),
      textLesson: randomUUID(),
      quizLesson: randomUUID(),
      quiz: randomUUID(),
      otherQuiz: randomUUID(),
      question: randomUUID(),
    };
    await db.query(
      `INSERT INTO lms_users (id, email, hashed_password, role) VALUES
         ($1, $2, 'x', 'instructor'), ($3, $4, 'x', 'admin'), ($5, $6, 'x', NULL)`,
      [
        ids.instructor, `inst-${ids.instructor}@gp737.invalid`,
        ids.admin, `admin-${ids.admin}@gp737.invalid`,
        ids.owner, `owner-${ids.owner}@gp737.invalid`,
      ]
    );
    await db.query(
      `INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud, is_free) VALUES
         ($1, $2, 'CARSI 2-day carpet cleaning workshop', $3, 'published', 0, true),
         ($4, $5, 'Another course', $3, 'published', 0, true)`,
      [ids.course, WORKSHOP_SLUG, ids.owner, ids.otherCourse, `gp737-other-${ids.otherCourse}`]
    );
    await db.query(
      `INSERT INTO lms_modules (id, course_id, title, order_index) VALUES
         ($1, $2, 'Day 1', 0), ($3, $4, 'Module 1', 0)`,
      [ids.module, ids.course, ids.otherModule, ids.otherCourse]
    );
    await db.query(
      `INSERT INTO lms_quizzes (id, course_id, title, pass_percentage, attempts_allowed) VALUES
         ($1, $2, 'Day 1 knowledge check', 70, 3), ($3, $4, 'Other check', 70, 3)`,
      [ids.quiz, ids.course, ids.otherQuiz, ids.otherCourse]
    );
    await db.query(
      `INSERT INTO lms_quiz_questions (id, quiz_id, question_text, options, correct_index, order_index, points)
       VALUES ($1, $2, 'Which supply does a 10 A GPO provide?', '["230 V","115 V"]'::jsonb, 0, 0, 1),
              ($3, $4, 'Placeholder question', '["Yes","No"]'::jsonb, 0, 0, 1)`,
      [ids.question, ids.quiz, randomUUID(), ids.otherQuiz]
    );
    await db.query(
      `INSERT INTO lms_lessons (id, module_id, title, content_type, content_body, order_index) VALUES
         ($1, $3, 'Welcome', 'text', '<p>Welcome to the workshop.</p>', 0),
         ($2, $3, 'Day 1 knowledge check', 'quiz', $4, 1)`,
      [ids.textLesson, ids.quizLesson, ids.module, ids.quiz]
    );
  });

  afterEach(async () => {
    const users = [ids.instructor, ids.admin, ids.owner];
    await db.query('DELETE FROM lms_quiz_attempts WHERE student_id = ANY($1::uuid[])', [users]);
    await db.query('DELETE FROM lms_lesson_progress WHERE student_id = ANY($1::uuid[])', [users]);
    await db.query('DELETE FROM lms_enrollments WHERE student_id = ANY($1::uuid[])', [users]);
    await db.query('DELETE FROM lms_courses WHERE id = ANY($1::uuid[])', [[ids.course, ids.otherCourse]]);
    await db.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [users]);
  });

  async function tokenFor(who: 'instructor' | 'admin') {
    const sub = who === 'instructor' ? ids.instructor : ids.admin;
    return signSessionToken({ sub, email: `${who}-${sub}@gp737.invalid`, full_name: who, role: who });
  }

  async function request(who: 'instructor' | 'admin', path: string, init: { method?: string; body?: unknown } = {}) {
    const sub = who === 'instructor' ? ids.instructor : ids.admin;
    return new NextRequest(`http://localhost${path}`, {
      method: init.method ?? 'GET',
      headers: {
        authorization: `Bearer ${await tokenFor(who)}`,
        'x-carsi-learner-id': sub,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
  }

  const params = <P,>(p: P): RouteCtx<P> => ({ params: Promise.resolve(p) });

  async function enrolmentStatus(studentId: string, courseId: string): Promise<string | null> {
    const r = await db.query<{ status: string }>(
      'SELECT status FROM lms_enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    return r.rows[0]?.status ?? null;
  }

  async function revoke(studentId: string) {
    await db.query(
      `INSERT INTO lms_enrollments (id, student_id, course_id, status, payment_reference)
       VALUES ($1, $2, $3, 'revoked', 'admin:full-access')`,
      [randomUUID(), studentId, ids.course]
    );
  }

  describe('gap 1: staff auto-enrolment on the checkpoint and quiz routes', () => {
    it('an instructor who opens the checkpoint before any lesson gets it (not 404)', async () => {
      const res = await routes.checkpoint(
        await request('instructor', `/api/lms/lessons/${ids.quizLesson}/checkpoint`),
        params({ lessonId: ids.quizLesson })
      );
      expect(res.status).toBe(200);
      expect(await enrolmentStatus(ids.instructor, ids.course)).toBe('active');
    });

    it('an admin who opens the checkpoint before any lesson gets it (not 404)', async () => {
      const res = await routes.checkpoint(
        await request('admin', `/api/lms/lessons/${ids.textLesson}/checkpoint`),
        params({ lessonId: ids.textLesson })
      );
      expect(res.status).toBe(200);
    });

    it('an instructor who opens the quiz before any lesson gets it (not 403)', async () => {
      const res = await routes.quiz(
        await request('instructor', `/api/lms/quizzes/${ids.quiz}`),
        params({ quizId: ids.quiz })
      );
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe(ids.quiz);
    });

    it('an instructor who submits the quiz before any lesson is graded (not 403)', async () => {
      const req = new NextRequest(`http://localhost/api/lms/quizzes/${ids.quiz}/attempt`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await tokenFor('instructor')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ answers: { [ids.question]: 0 } }),
      });
      const res = await routes.attempt(req, params({ quizId: ids.quiz }));
      expect(res.status).toBe(200);
      expect((await res.json()).passed).toBe(true);
    });

    it('does not widen access: an instructor on a course outside the allow-list still gets 403 and no row', async () => {
      const res = await routes.quiz(
        await request('instructor', `/api/lms/quizzes/${ids.otherQuiz}`),
        params({ quizId: ids.otherQuiz })
      );
      expect(res.status).toBe(403);
      expect(await enrolmentStatus(ids.instructor, ids.otherCourse)).toBeNull();
    });
  });

  describe('gap 2: a revoked staff row loses access on every workshop route', () => {
    it('control: staff with no row can download both manuals', async () => {
      const p = await routes.participantManual(await request('instructor', '/api/lms/workshops/carpet-cleaning/participant-manual'));
      const i = await routes.instructorManual(await request('instructor', '/api/lms/workshops/carpet-cleaning/instructor-manual'));
      expect([p.status, i.status]).toEqual([200, 200]);
    });

    it('a revoked instructor is denied on the lesson, curriculum, checkpoint, quiz, attempt and both manuals', async () => {
      await revoke(ids.instructor);
      const statuses = {
        lesson: (await routes.lesson(await request('instructor', `/api/lms/lessons/${ids.textLesson}`), params({ lessonId: ids.textLesson }))).status,
        curriculum: (await routes.curriculum(await request('instructor', `/api/lms/courses/${WORKSHOP_SLUG}/curriculum`), params({ slug: WORKSHOP_SLUG }))).status,
        checkpoint: (await routes.checkpoint(await request('instructor', `/api/lms/lessons/${ids.quizLesson}/checkpoint`), params({ lessonId: ids.quizLesson }))).status,
        quiz: (await routes.quiz(await request('instructor', `/api/lms/quizzes/${ids.quiz}`), params({ quizId: ids.quiz }))).status,
        attempt: (
          await routes.attempt(
            new NextRequest(`http://localhost/api/lms/quizzes/${ids.quiz}/attempt`, {
              method: 'POST',
              headers: { authorization: `Bearer ${await tokenFor('instructor')}`, 'content-type': 'application/json' },
              body: JSON.stringify({ answers: { [ids.question]: 0 } }),
            }),
            params({ quizId: ids.quiz })
          )
        ).status,
        participantManual: (await routes.participantManual(await request('instructor', '/api/lms/workshops/carpet-cleaning/participant-manual'))).status,
        instructorManual: (await routes.instructorManual(await request('instructor', '/api/lms/workshops/carpet-cleaning/instructor-manual'))).status,
      };
      expect(statuses).toEqual({
        lesson: 404,
        curriculum: 403,
        checkpoint: 404,
        quiz: 403,
        attempt: 403,
        participantManual: 403,
        instructorManual: 403,
      });
      // Staff auto-enrolment never reactivated the row, and no attempt was recorded.
      expect(await enrolmentStatus(ids.instructor, ids.course)).toBe('revoked');
      const attempts = await db.query('SELECT 1 FROM lms_quiz_attempts WHERE student_id = $1', [ids.instructor]);
      expect(attempts.rows).toHaveLength(0);
    });

    it('a revoked admin is denied the participant manual too', async () => {
      await revoke(ids.admin);
      const res = await routes.participantManual(await request('admin', '/api/lms/workshops/carpet-cleaning/participant-manual'));
      expect(res.status).toBe(403);
      expect(await enrolmentStatus(ids.admin, ids.course)).toBe('revoked');
    });
  });
});
