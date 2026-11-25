/**
 * Retention metrics on a REAL PostgreSQL (Learning OS register row 4).
 *
 * Seeds enrolments with known activity, then checks each count moves by exactly the expected
 * amount (measured as a before/after difference, so rows other suites leave behind cannot affect
 * it). Includes the overwrite case: a lesson revisited on day 20 has lost its day-0 visit, and must
 * not be read as a return inside 7 days, and the admin force-complete cases (GP-794): timestamps an
 * admin force-complete wrote are not learner activity. afterAll deletes everything this file created.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('retention metrics (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('retention metrics (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  let prisma: typeof import('@/lib/prisma').prisma;
  let metrics: typeof import('./retention-metrics');

  const instructor = randomUUID();
  const course = randomUUID();
  const mod = randomUUID();
  const lessonA = randomUUID();
  const lessonB = randomUUID();
  const students: string[] = [];

  type Visit = { lesson: string; accessedDay: number; completedDay?: number };
  /**
   * One learner and one enrolment on the course, `enrolledDaysAgo` days before now, with lesson
   * rows whose stored timestamps fall `accessedDay` / `completedDay` days after enrolment
   * (plus one hour, so a day never straddles a Sydney midnight boundary by accident).
   */
  async function seed(opts: {
    enrolledDaysAgo: number;
    status?: string;
    completed?: boolean;
    visits: Visit[];
    /** An admin force-complete audit row on this day (same clock time as the visits). */
    forceCompletedDay?: number;
  }) {
    const student = randomUUID();
    students.push(student);
    await db.query("INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, 'x')", [
      student,
      `ret-${student}@retention-test.invalid`,
    ]);
    const enrolment = randomUUID();
    await db.query(
      `INSERT INTO lms_enrollments (id, student_id, course_id, status, enrolled_at, completed_at)
       VALUES ($1, $2, $3, $4, now() - make_interval(days => $5), CASE WHEN $6 THEN now() ELSE NULL END)`,
      [
        enrolment,
        student,
        course,
        opts.status ?? 'active',
        opts.enrolledDaysAgo,
        opts.completed === true,
      ]
    );
    if (opts.forceCompletedDay != null) {
      // forceCompleteEnrollment writes this row in the same transaction as the lesson rows; the
      // audit time is the transaction's, a moment after the lesson timestamps.
      await db.query(
        `INSERT INTO lms_learner_admin_audit_events
           (id, action, reason, actor_kind, actor_ref, actor_email, student_ref, enrollment_ref, course_ref, created_at)
         VALUES ($1, 'force_complete', 'retention test', 'bootstrap_admin', NULL, 'admin@retention-test.invalid',
           $2, $3, $4, now() - make_interval(days => $5) + make_interval(days => $6, hours => 1, secs => 2))`,
        [randomUUID(), student, enrolment, course, opts.enrolledDaysAgo, opts.forceCompletedDay]
      );
    }
    for (const v of opts.visits) {
      await db.query(
        `INSERT INTO lms_lesson_progress (id, student_id, lesson_id, completed, completed_at, last_accessed_at)
         VALUES ($1, $2, $3, $4,
           CASE WHEN $5::int IS NULL THEN NULL ELSE now() - make_interval(days => $6) + make_interval(days => $5::int, hours => 1) END,
           now() - make_interval(days => $6) + make_interval(days => $7, hours => 1))`,
        [
          randomUUID(),
          student,
          v.lesson,
          v.completedDay != null,
          v.completedDay ?? null,
          opts.enrolledDaysAgo,
          v.accessedDay,
        ]
      );
    }
  }

  let before: import('./retention-metrics').RetentionMetrics;
  let after: import('./retention-metrics').RetentionMetrics;

  beforeAll(async () => {
    await db.connect();
    ({ prisma } = await import('@/lib/prisma'));
    metrics = await import('./retention-metrics');

    await db.query("INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, 'x')", [
      instructor,
      `ret-inst-${instructor}@retention-test.invalid`,
    ]);
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Retention test', $3, 'published', 0)",
      [course, `retention-test-${course}`, instructor]
    );
    await db.query(
      "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'M', 0)",
      [mod, course]
    );
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, order_index) VALUES ($1, $3, 'A', 'text', 0), ($2, $3, 'B', 'text', 1)",
      [lessonA, lessonB, mod]
    );

    before = await metrics.getRetentionMetrics();

    // 1. Day 0 and day 3, then completed the course: activated, returned in 7 and 30, completed.
    await seed({
      enrolledDaysAgo: 40,
      completed: true,
      visits: [
        { lesson: lessonA, accessedDay: 0, completedDay: 0 },
        { lesson: lessonB, accessedDay: 3 },
      ],
    });
    // 2. Day 0 and day 20: returned in 30, not in 7.
    await seed({
      enrolledDaysAgo: 40,
      visits: [
        { lesson: lessonA, accessedDay: 0 },
        { lesson: lessonB, accessedDay: 20 },
      ],
    });
    // 3. Enrolled, never opened a lesson: not activated.
    await seed({ enrolledDaysAgo: 40, visits: [] });
    // 4. Enrolled 2 days ago, active on both days: activated, but no window has passed yet.
    await seed({
      enrolledDaysAgo: 2,
      visits: [
        { lesson: lessonA, accessedDay: 0 },
        { lesson: lessonB, accessedDay: 1 },
      ],
    });
    // 5. Refunded (revoked) with activity and a completion: left out of every count.
    await seed({
      enrolledDaysAgo: 40,
      status: 'revoked',
      completed: true,
      visits: [
        { lesson: lessonA, accessedDay: 0, completedDay: 0 },
        { lesson: lessonB, accessedDay: 2 },
      ],
    });
    // 6. Overwrite case: lesson A completed day 0 but last opened day 20; lesson B day 25.
    //    Only day 0 is inside 7 days (not a 7-day return); days 0, 20 and 25 are inside 30.
    await seed({
      enrolledDaysAgo: 40,
      visits: [
        { lesson: lessonA, accessedDay: 20, completedDay: 0 },
        { lesson: lessonB, accessedDay: 25 },
      ],
    });
    // 7. Enrolled 10 days ago, active day 0 and day 5: 7-day window passed and returned;
    //    30-day window not passed yet.
    await seed({
      enrolledDaysAgo: 10,
      visits: [
        { lesson: lessonA, accessedDay: 0 },
        { lesson: lessonB, accessedDay: 5 },
      ],
    });

    // 8. Admin force-complete only (GP-794): the admin wrote every lesson's timestamps on day 1
    //    and the course completed, but the learner never opened a lesson. Enrolled and completed,
    //    never activated.
    await seed({
      enrolledDaysAgo: 40,
      completed: true,
      visits: [
        { lesson: lessonA, accessedDay: 1, completedDay: 1 },
        { lesson: lessonB, accessedDay: 1, completedDay: 1 },
      ],
      forceCompletedDay: 1,
    });
    // 9. Learner opened lesson B on day 4; an admin force-completed on day 2, which rewrote
    //    lesson A on day 2. One real day only: activated, inside both windows, never a return.
    await seed({
      enrolledDaysAgo: 40,
      visits: [
        { lesson: lessonA, accessedDay: 2, completedDay: 2 },
        { lesson: lessonB, accessedDay: 4 },
      ],
      forceCompletedDay: 2,
    });

    after = await metrics.getRetentionMetrics();
  });

  afterAll(async () => {
    // The course cascades to modules, lessons and enrolments; users cascade to progress.
    await db.query('DELETE FROM lms_learner_admin_audit_events WHERE course_ref = $1', [course]);
    await db.query('DELETE FROM lms_courses WHERE id = $1', [course]);
    await db.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [[instructor, ...students]]);
    await db.end().catch(() => {});
    await prisma?.$disconnect().catch(() => {});
  });

  it('counts enrolled, activated and completed, leaving refunded enrolments out', () => {
    expect(after.enrolled - before.enrolled).toBe(8);
    // An admin force-complete alone is not activation (GP-794).
    expect(after.activated - before.activated).toBe(6);
    expect(after.completed - before.completed).toBe(2);
  });

  it('counts a 7-day return only from two stored days inside the window, once it has passed', () => {
    expect(after.returnWithin7Days.days).toBe(7);
    expect(after.returnWithin7Days.eligible - before.returnWithin7Days.eligible).toBe(5);
    // A force-complete day plus one learner day is not a return (GP-794).
    expect(after.returnWithin7Days.returned - before.returnWithin7Days.returned).toBe(2);
  });

  it('counts a 30-day return the same way', () => {
    expect(after.returnWithin30Days.days).toBe(30);
    expect(after.returnWithin30Days.eligible - before.returnWithin30Days.eligible).toBe(4);
    expect(after.returnWithin30Days.returned - before.returnWithin30Days.returned).toBe(3);
  });

  it('holds numbers only: nothing that could identify a learner', () => {
    const flat = JSON.stringify(after);
    expect(flat).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/i);
    const leaves = (v: unknown): unknown[] =>
      v !== null && typeof v === 'object' ? Object.values(v).flatMap(leaves) : [v];
    expect(leaves(after).every((x) => typeof x === 'number')).toBe(true);
  });
});
