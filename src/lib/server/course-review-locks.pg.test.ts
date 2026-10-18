/**
 * Course-review locks on a REAL PostgreSQL, two sessions at once (release-gate r8, r9).
 *
 * Runs the real service code (real Prisma, real SQL, real locks). A second connection plays a
 * refund/revocation or an admin demotion; a third watches pg_stat_activity so each step waits for
 * a genuine lock wait instead of a sleep.
 *
 * Proves:
 *   - r8: a review whose enrolment is revoked between the route's check and the write is refused
 *     (upsertReview re-checks access under its FOR NO KEY UPDATE lock);
 *   - r9: a demotion committed before the moderator's re-validation means the real GET route reads
 *     no hidden review; a demotion attempted DURING the private read waits until that read is done,
 *     because the read runs in the re-validation transaction while its FOR SHARE locks are held.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service, before
 * any seeding. It needs a LOCAL, migrated, EMPTY database (no enrolments) and refuses anything
 * else. With CI=true and no usable DATABASE_URL it FAILS; locally it is skipped ("runs in CI").
 */
import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const IN_CI = process.env.CI === 'true';
const HOST = (() => {
  try {
    return DB_URL ? new URL(DB_URL).hostname : '';
  } catch {
    return '';
  }
})();
const RUNNABLE = Boolean(DB_URL) && ['localhost', '127.0.0.1', '::1'].includes(HOST);

if (!RUNNABLE) {
  describe('course-review locks (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(
          `CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}"). The two-session lock proof must run, not skip.`
        );
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('course-review locks (real PostgreSQL, two sessions)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let reviews: typeof import('./course-reviews');
  let resolveCurrentAdmin: typeof import('./current-admin').resolveCurrentAdmin;
  let reviewsGET: typeof import('../../../app/api/lms/courses/[slug]/reviews/route').GET;
  let signSessionToken: typeof import('@/lib/auth/session-jwt').signSessionToken;
  const writer = new pg.Client({ connectionString: DB_URL });
  const writer2 = new pg.Client({ connectionString: DB_URL });
  const watcher = new pg.Client({ connectionString: DB_URL });
  let ids: {
    learner: string;
    instructor: string;
    admin: string;
    course: string;
    enrolment: string;
    review: string;
  };
  const adminEmail = () => `admin-${ids.admin}@lock-test.invalid`;
  const slug = () => `lock-test-${ids.course}`;

  beforeAll(async () => {
    await Promise.all([writer.connect(), writer2.connect(), watcher.connect()]);
    // Refuse to touch a database that holds real enrolments.
    const n = await watcher.query<{ n: number }>('SELECT count(*)::int AS n FROM lms_enrollments');
    if (n.rows[0]!.n !== 0)
      throw new Error(
        'course-review-locks.pg.test needs an EMPTY migrated database (no enrolments).'
      );
    ({ prisma } = await import('@/lib/prisma'));
    reviews = await import('./course-reviews');
    ({ resolveCurrentAdmin } = await import('./current-admin'));
    ({ GET: reviewsGET } = await import('../../../app/api/lms/courses/[slug]/reviews/route'));
    ({ signSessionToken } = await import('@/lib/auth/session-jwt'));
  });

  afterAll(async () => {
    await prisma?.$disconnect().catch(() => {});
    await Promise.all([writer.end(), writer2.end(), watcher.end()].map((p) => p.catch(() => {})));
  });

  beforeEach(async () => {
    ids = {
      learner: randomUUID(),
      instructor: randomUUID(),
      admin: randomUUID(),
      course: randomUUID(),
      enrolment: randomUUID(),
      review: randomUUID(),
    };
    await watcher.query(
      "INSERT INTO lms_users (id, email, hashed_password, role) VALUES ($1, $2, 'x', NULL), ($3, $4, 'x', NULL), ($5, $6, 'x', 'admin')",
      [
        ids.learner,
        `learner-${ids.learner}@lock-test.invalid`,
        ids.instructor,
        `inst-${ids.instructor}@lock-test.invalid`,
        ids.admin,
        adminEmail(),
      ]
    );
    await watcher.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Lock test', $3, 'published', 0)",
      [ids.course, slug(), ids.instructor]
    );
    await watcher.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now() - interval '5 days')",
      [ids.enrolment, ids.learner, ids.course]
    );
  });

  afterEach(async () => {
    for (const c of [writer, writer2]) await c.query('ROLLBACK').catch(() => {});
    await watcher.query('DELETE FROM lms_enrollments WHERE student_id = $1', [ids.learner]);
    await watcher.query('DELETE FROM lms_courses WHERE instructor_id = $1', [ids.instructor]);
    await watcher.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [
      [ids.learner, ids.instructor, ids.admin],
    ]);
  });

  /** Wait until at least `n` sessions are waiting on a lock in this database (no sleeps as evidence). */
  async function waitForLockWaiters(n = 1): Promise<void> {
    const deadline = Date.now() + 15_000;
    for (;;) {
      const r = await watcher.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'"
      );
      if (r.rows[0]!.n >= n) return;
      if (Date.now() > deadline) throw new Error(`no session reached a lock wait (wanted ${n})`);
      await new Promise((res) => setTimeout(res, 25));
    }
  }

  /** True when `sql` cannot get its lock within 500 ms (lock_not_available), i.e. it would wait. */
  async function wouldWait(
    client: pg.Client,
    sql: string,
    params: unknown[] = []
  ): Promise<boolean> {
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout = '500ms'");
      await client.query(sql, params);
      return false;
    } catch (e) {
      return (e as { code?: string }).code === '55P03';
    } finally {
      await client.query('ROLLBACK');
    }
  }

  async function addHiddenReview() {
    await watcher.query(
      "INSERT INTO lms_course_reviews (id, course_id, student_id, rating, title, body, is_published) VALUES ($1, $2, $3, 1, 'Hidden one', 'x', false)",
      [ids.review, ids.course, ids.learner]
    );
  }

  const DEMOTE = "UPDATE lms_users SET role = 'student' WHERE id = $1";

  it('control: with nothing in flight, a demotion and a revocation do not wait', async () => {
    expect(await wouldWait(writer, DEMOTE, [ids.admin])).toBe(false);
    expect(
      await wouldWait(writer, "UPDATE lms_enrollments SET status = 'revoked' WHERE id = $1", [
        ids.enrolment,
      ])
    ).toBe(false);
  });

  it('r8 reviewer case: a revocation committed between the route check and the lock refuses the review', async () => {
    await writer.query('BEGIN');
    await writer.query(
      "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
      [ids.enrolment]
    );
    const submit = reviews
      .upsertReview({
        courseId: ids.course,
        studentId: ids.learner,
        rating: 5,
        title: 'x',
        body: 'y',
      })
      .then(
        () => 'saved',
        (e: unknown) => e
      );
    await waitForLockWaiters(1); // the review transaction waits on the enrolment row lock
    await writer.query('COMMIT');
    expect(await submit).toBeInstanceOf(reviews.ReviewNotAllowedError);
    const rows = await watcher.query(
      'SELECT 1 FROM lms_course_reviews WHERE course_id = $1 AND student_id = $2',
      [ids.course, ids.learner]
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('r9 reviewer case (real route): a demotion committed before the re-validation means no hidden review is read', async () => {
    await addHiddenReview();
    const token = await signSessionToken({
      sub: ids.admin,
      email: adminEmail(),
      full_name: 'Admin',
      role: 'admin',
    });
    const request = () =>
      reviewsGET(
        new NextRequest(`http://localhost/api/lms/courses/${slug()}/reviews`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        {
          params: Promise.resolve({ slug: slug() }),
        }
      );
    // Positive control: while still an admin, the old token sees the hidden review.
    const before = await (await request()).json();
    expect(before.can_moderate).toBe(true);
    expect(before.reviews.map((r: { id: string }) => r.id)).toContain(ids.review);
    // The demotion is in flight (row locked) when the moderator's request arrives.
    await writer.query('BEGIN');
    await writer.query(DEMOTE, [ids.admin]);
    const pending = request();
    await waitForLockWaiters(1); // the route's FOR SHARE re-validation waits on the demotion
    await writer.query('COMMIT');
    const after = await (await pending).json();
    expect(after.can_moderate).toBe(false);
    expect(after.reviews.map((r: { id: string }) => r.id)).not.toContain(ids.review);
  });

  it('r9: a demotion attempted DURING the private read waits until the read is done (locks held through it)', async () => {
    await addHiddenReview();
    let started!: () => void;
    let release!: () => void;
    const inRead = new Promise<void>((r) => (started = r));
    const gate = new Promise<void>((r) => (release = r));
    const session = { via: 'lms_session' as const, userId: ids.admin, email: adminEmail() };
    // The same composition the GET route and the summary route use: re-validate, then read, in one transaction.
    const read = prisma.$transaction(async (tx) => {
      if (!(await resolveCurrentAdmin(tx, session))) return null;
      started();
      await gate;
      return reviews.getCourseReviews(ids.course, true, tx);
    });
    await inRead;
    expect(await wouldWait(writer, DEMOTE, [ids.admin])).toBe(true);
    const demote = writer2.query(DEMOTE, [ids.admin]);
    await waitForLockWaiters(1);
    release();
    const result = await read;
    await demote;
    expect(result?.reviews.map((r) => r.id)).toContain(ids.review); // read while still an admin
    expect(
      (await watcher.query('SELECT role FROM lms_users WHERE id = $1', [ids.admin])).rows[0].role
    ).toBe('student');
  });
});
