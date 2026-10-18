/**
 * Review-request send locks on a REAL PostgreSQL, two sessions at once (release-gate review r6/r7).
 *
 * Runs the real runReviewRequestEmails (real Prisma, real SQL, real locks); only the email
 * transport is replaced, so a send can be paused while it is "with the provider". A second
 * connection plays the admin, the learner or a revoking process; a third watches
 * pg_stat_activity so each step waits for a genuine lock wait instead of a sleep.
 *
 * Proves, for the ONE locked transaction per send (spec D10f):
 *   - OFF, unsubscribe and revoke DURING a send wait for it to finish, then take effect;
 *   - OFF, unsubscribe and revoke committed BEFORE the send's checks stop the send;
 *   - a concurrent completion, revoke and switch change during a send finish without deadlock;
 *   - r7: OFF through the REAL Prisma setter lands behind a send held past Prisma's 5 s default,
 *     and a send that starts while OFF is waiting never reaches the provider (fair lock);
 *   - r7: a review submitted during a send waits for it; one committed before the checks stops it;
 *   - r7: a lock wait longer than the send's bound fails before the provider call (retryable);
 *   - r8: with ten overlapping runs and one send held at the provider, only ONE send transaction
 *     exists and OFF through the real setter still gets a connection and lands;
 *   - r8: a review whose enrolment is revoked between the route check and the lock is refused.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service, before
 * any seeding. It needs a LOCAL, migrated, EMPTY database (no enrolments) and refuses anything
 * else. With CI=true and no usable DATABASE_URL it FAILS; locally it is skipped ("runs in CI").
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/server/email', () => ({ sendEmail: mail.send, isEmailConfigured: () => true }));

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
  describe('review-request send locks (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('review-request send locks (real PostgreSQL, two sessions)', () => {
  let runReviewRequestEmails: typeof import('./review-request-email').runReviewRequestEmails;
  let setReviewRequestEmailsEnabled: typeof import('./review-request-email').setReviewRequestEmailsEnabled;
  let upsertReview: typeof import('./course-reviews').upsertReview;
  let ReviewNotAllowedError: typeof import('./course-reviews').ReviewNotAllowedError;
  let prisma: typeof import('@/lib/prisma').prisma;
  const writer = new pg.Client({ connectionString: DB_URL });
  const writer2 = new pg.Client({ connectionString: DB_URL });
  const watcher = new pg.Client({ connectionString: DB_URL });
  let ids: {
    learner: string;
    instructor: string;
    admin: string;
    course: string;
    course2: string;
    enrolment: string;
  };

  beforeAll(async () => {
    await Promise.all([writer.connect(), writer2.connect(), watcher.connect()]);
    // Refuse to touch a database that holds real enrolments: this test drives the real runner.
    const n = await watcher.query<{ n: number }>('SELECT count(*)::int AS n FROM lms_enrollments');
    if (n.rows[0]!.n !== 0)
      throw new Error(
        'review-send-locks.pg.test needs an EMPTY migrated database (no enrolments).'
      );
    ({ runReviewRequestEmails, setReviewRequestEmailsEnabled } =
      await import('./review-request-email'));
    ({ upsertReview, ReviewNotAllowedError } = await import('./course-reviews'));
    ({ prisma } = await import('@/lib/prisma'));
  });

  afterAll(async () => {
    await watcher
      .query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1')
      .catch(() => {});
    await prisma?.$disconnect().catch(() => {});
    await Promise.all([writer.end(), writer2.end(), watcher.end()].map((p) => p.catch(() => {})));
  });

  beforeEach(async () => {
    mail.send.mockReset().mockResolvedValue({ sent: true, messageId: 'm-lock' });
    ids = {
      learner: randomUUID(),
      instructor: randomUUID(),
      admin: randomUUID(),
      course: randomUUID(),
      course2: randomUUID(),
      enrolment: randomUUID(),
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
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Lock test', $3, 'published', 0), ($4, $5, 'Lock test 2', $3, 'published', 0)",
      [
        ids.course,
        `lock-test-${ids.course}`,
        ids.instructor,
        ids.course2,
        `lock-test-${ids.course2}`,
      ]
    );
    await watcher.query('UPDATE lms_review_request_settings SET enabled = true WHERE id = 1');
    // Completed 5 days ago while the switch is on: the trigger marks it eligible.
    await watcher.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now() - interval '5 days')",
      [ids.enrolment, ids.learner, ids.course]
    );
    expect(await ledgerStatus(ids.enrolment)).toBe('eligible');
  });

  afterEach(async () => {
    for (const c of [writer, writer2]) await c.query('ROLLBACK').catch(() => {});
    await watcher.query('DELETE FROM lms_enrollments WHERE student_id = $1', [ids.learner]);
    await watcher.query('DELETE FROM lms_courses WHERE instructor_id = $1', [ids.instructor]);
    await watcher.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [
      [ids.learner, ids.instructor, ids.admin],
    ]);
    await watcher.query('DELETE FROM lms_review_request_switch_events WHERE actor_email = $1', [
      adminEmail(),
    ]);
    await watcher.query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1');
  });

  const adminEmail = () => `admin-${ids.admin}@lock-test.invalid`;
  const adminSession = () => ({
    via: 'lms_session' as const,
    userId: ids.admin,
    email: adminEmail(),
  });
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async function ledgerRow(enrolment: string) {
    const r = await watcher.query<{
      status: string;
      failure_reason: string | null;
      send_attempted_at: Date | null;
    }>(
      'SELECT status, failure_reason, send_attempted_at FROM lms_review_request_emails WHERE enrollment_id = $1',
      [enrolment]
    );
    return r.rows[0];
  }

  async function ledgerStatus(enrolment: string): Promise<string | undefined> {
    const r = await watcher.query<{ status: string }>(
      'SELECT status FROM lms_review_request_emails WHERE enrollment_id = $1',
      [enrolment]
    );
    return r.rows[0]?.status;
  }

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

  /** Make the next provider call pause until released, as a slow Mailtrap reply would. */
  function holdTheSend() {
    let release!: () => void;
    let started!: () => void;
    const inSend = new Promise<void>((r) => (started = r));
    const gate = new Promise<void>((r) => (release = r));
    mail.send.mockImplementationOnce(async () => {
      started();
      await gate;
      return { sent: true, messageId: 'm-held' };
    });
    return { inSend, release };
  }

  it('control: with no send in flight the same OFF, unsubscribe and revoke do not wait', async () => {
    // Without this, a probe that always reported "would wait" would pass every case below.
    const probes: [string, unknown[]][] = [
      ['SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR UPDATE', []],
      ['UPDATE lms_users SET email_opt_out = true WHERE id = $1', [ids.learner]],
      ["UPDATE lms_enrollments SET status = 'active' WHERE id = $1", [ids.enrolment]],
    ];
    for (const [sql, params] of probes) expect(await wouldWait(writer, sql, params)).toBe(false);
  });

  it('OFF during a send waits for the send to finish, then takes effect', async () => {
    const hold = holdTheSend();
    const run = runReviewRequestEmails({});
    await hold.inSend;
    expect(
      await wouldWait(
        writer,
        'SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR UPDATE'
      )
    ).toBe(true);
    const off = writer.query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1');
    await waitForLockWaiters(1);
    hold.release();
    const res = await run;
    await off;
    expect(res.sent).toBe(1);
    expect(await ledgerStatus(ids.enrolment)).toBe('sent');
    expect(
      (await watcher.query('SELECT enabled FROM lms_review_request_settings WHERE id = 1')).rows[0]
        .enabled
    ).toBe(false);
  });

  it("OFF committed before the send's locked checks stops the send (row stays eligible)", async () => {
    await writer.query('BEGIN');
    await writer.query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1');
    const run = runReviewRequestEmails({});
    await waitForLockWaiters(1); // the runner's FOR SHARE read is waiting on the OFF
    await writer.query('COMMIT');
    const res = await run;
    expect(mail.send).not.toHaveBeenCalled();
    expect(res).toMatchObject({ sent: 0, stopped_by_switch: true });
    expect(await ledgerStatus(ids.enrolment)).toBe('eligible');
  });

  it('unsubscribe during a send waits for the send to finish, then takes effect', async () => {
    const hold = holdTheSend();
    const run = runReviewRequestEmails({});
    await hold.inSend;
    expect(
      await wouldWait(writer, 'UPDATE lms_users SET email_opt_out = true WHERE id = $1', [
        ids.learner,
      ])
    ).toBe(true);
    const unsub = writer.query('UPDATE lms_users SET email_opt_out = true WHERE id = $1', [
      ids.learner,
    ]);
    await waitForLockWaiters(1);
    hold.release();
    expect((await run).sent).toBe(1);
    await unsub;
    expect(
      (await watcher.query('SELECT email_opt_out FROM lms_users WHERE id = $1', [ids.learner]))
        .rows[0].email_opt_out
    ).toBe(true);
  });

  it("unsubscribe committed before the send's locked checks stops the send", async () => {
    await writer.query('BEGIN');
    await writer.query('UPDATE lms_users SET email_opt_out = true WHERE id = $1', [ids.learner]);
    const run = runReviewRequestEmails({});
    await waitForLockWaiters(1);
    await writer.query('COMMIT');
    const res = await run;
    expect(mail.send).not.toHaveBeenCalled();
    expect(res.skipped.opted_out).toBe(1);
    expect(await ledgerStatus(ids.enrolment)).toBe('skipped');
  });

  it('revocation during a send (full and status-only) waits for the send, then takes effect; the sent row is kept', async () => {
    const hold = holdTheSend();
    const run = runReviewRequestEmails({});
    await hold.inSend;
    expect(
      await wouldWait(
        writer,
        "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
        [ids.enrolment]
      )
    ).toBe(true);
    expect(
      await wouldWait(writer, "UPDATE lms_enrollments SET status = 'active' WHERE id = $1", [
        ids.enrolment,
      ])
    ).toBe(true);
    const revoke = writer.query(
      "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
      [ids.enrolment]
    );
    await waitForLockWaiters(1);
    hold.release();
    expect((await run).sent).toBe(1);
    await revoke;
    expect(await ledgerStatus(ids.enrolment)).toBe('sent');
    expect(
      (await watcher.query('SELECT status FROM lms_enrollments WHERE id = $1', [ids.enrolment]))
        .rows[0].status
    ).toBe('revoked');
  });

  it('revocation committed before the send stops the send', async () => {
    await writer.query('BEGIN');
    await writer.query(
      "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
      [ids.enrolment]
    );
    const run = runReviewRequestEmails({});
    await waitForLockWaiters(1);
    await writer.query('COMMIT');
    await run;
    expect(mail.send).not.toHaveBeenCalled();
    expect(await ledgerStatus(ids.enrolment)).toBe('ineligible');
  });

  it('a concurrent completion, revoke and switch change during a send all finish — no deadlock', async () => {
    const hold = holdTheSend();
    const run = runReviewRequestEmails({});
    await hold.inSend;
    const enrolment2 = randomUUID();
    // Session 1: a new completion (its trigger reads the switch FOR SHARE), then a revoke of the
    // enrolment being sent (waits for the send), in one transaction.
    const session1 = (async () => {
      await writer.query('BEGIN');
      await writer.query(
        "INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now())",
        [enrolment2, ids.learner, ids.course2]
      );
      await writer.query(
        "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
        [ids.enrolment]
      );
      await writer.query('COMMIT');
    })();
    // Session 2: an admin switching off through the real setter (waits for the send's fair lock,
    // then for session 1's shared row lock).
    const session2 = setReviewRequestEmailsEnabled(false, adminSession());
    await waitForLockWaiters(2);
    hold.release();
    const [res] = await Promise.all([run, session1, session2]); // a deadlock would reject with 40P01
    expect(res.sent).toBe(1);
    expect(await ledgerStatus(ids.enrolment)).toBe('sent'); // evidence kept through the revoke
    expect(await ledgerStatus(enrolment2)).toBe('eligible'); // completed while the switch was still on
    expect(
      (await watcher.query('SELECT enabled FROM lms_review_request_settings WHERE id = 1')).rows[0]
        .enabled
    ).toBe(false);
  });

  it('r7: OFF through the real Prisma setter lands behind a send held 7 s, and a send started while OFF waits never reaches the provider', async () => {
    const enrolment2 = randomUUID();
    await watcher.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now() - interval '4 days')",
      [enrolment2, ids.learner, ids.course2]
    );
    expect(await ledgerStatus(enrolment2)).toBe('eligible');
    const hold = holdTheSend();
    const run1 = runReviewRequestEmails({});
    await hold.inSend;
    const heldAt = Date.now();
    const off = setReviewRequestEmailsEnabled(false, adminSession());
    await waitForLockWaiters(1); // OFF is queued for the switch's fair lock
    const run2 = runReviewRequestEmails({}); // a second run reaches its next send
    await waitForLockWaiters(2); // ...and queues BEHIND the waiting OFF, not beside the send
    await sleep(Math.max(0, 7_000 - (Date.now() - heldAt))); // beyond Prisma's 5 s default
    hold.release();
    const [r1, r2, saved] = await Promise.all([run1, run2, off]);
    expect(Date.now() - heldAt).toBeGreaterThanOrEqual(7_000);
    expect(saved.enabled).toBe(false);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(r1.sent + r2.sent).toBe(1);
    expect(await ledgerStatus(ids.enrolment)).toBe('sent');
    expect(await ledgerStatus(enrolment2)).not.toBe('sent');
    expect(
      (await watcher.query('SELECT enabled FROM lms_review_request_settings WHERE id = 1')).rows[0]
        .enabled
    ).toBe(false);
    const events = await watcher.query(
      'SELECT new_enabled FROM lms_review_request_switch_events WHERE actor_email = $1',
      [adminEmail()]
    );
    expect(events.rows).toEqual([{ new_enabled: false }]);
  });

  it('r7: a review submitted during a send (real upsertReview) waits for the send to finish', async () => {
    const hold = holdTheSend();
    const run = runReviewRequestEmails({});
    await hold.inSend;
    expect(
      await wouldWait(
        writer,
        'SELECT "id" FROM "lms_enrollments" WHERE "student_id" = $1 AND "course_id" = $2 FOR NO KEY UPDATE',
        [ids.learner, ids.course]
      )
    ).toBe(true);
    let saved = false;
    const submit = upsertReview({
      courseId: ids.course,
      studentId: ids.learner,
      rating: 5,
      title: 'Good',
      body: 'Useful',
    }).then(() => {
      saved = true;
    });
    await waitForLockWaiters(1);
    expect(saved).toBe(false);
    hold.release();
    expect((await run).sent).toBe(1);
    await submit;
    const reviews = await watcher.query(
      'SELECT rating FROM lms_course_reviews WHERE course_id = $1 AND student_id = $2',
      [ids.course, ids.learner]
    );
    expect(reviews.rows).toEqual([{ rating: 5 }]);
  });

  it("r7 reviewer case: a review committed after the cheap pre-check but before the send's locked checks → no send", async () => {
    // The same protocol upsertReview follows: lock the enrolment row, then write the review.
    await writer.query('BEGIN');
    await writer.query('SELECT "id" FROM "lms_enrollments" WHERE "id" = $1 FOR NO KEY UPDATE', [
      ids.enrolment,
    ]);
    await writer.query(
      'INSERT INTO lms_course_reviews (id, course_id, student_id, rating, is_published) VALUES ($1, $2, $3, 4, true)',
      [randomUUID(), ids.course, ids.learner]
    );
    const run = runReviewRequestEmails({}); // its pre-check cannot see the uncommitted review
    await waitForLockWaiters(1); // its send transaction waits on the enrolment row
    await writer.query('COMMIT');
    const res = await run;
    expect(mail.send).not.toHaveBeenCalled();
    expect(res.skipped.already_reviewed).toBe(1);
    expect(await ledgerRow(ids.enrolment)).toMatchObject({
      status: 'skipped',
      failure_reason: 'already_reviewed',
      send_attempted_at: null,
    });
  });

  it('r7: a lock wait longer than the send bound fails fast before the provider call — retryable, never ambiguous', async () => {
    await writer.query('BEGIN');
    await writer.query('UPDATE lms_enrollments SET last_accessed_lesson_id = NULL WHERE id = $1', [
      ids.enrolment,
    ]);
    const started = Date.now();
    const res = await runReviewRequestEmails({});
    expect(Date.now() - started).toBeLessThan(5_000); // the 2 s lock_timeout, not the 20 s transaction limit
    await writer.query('ROLLBACK');
    expect(mail.send).not.toHaveBeenCalled();
    expect(res).toMatchObject({ sent: 0, failed: 1, ambiguous: 0 });
    expect(await ledgerRow(ids.enrolment)).toMatchObject({
      status: 'failed',
      failure_reason: 'pre_send_error',
      send_attempted_at: null,
    });
    expect((await runReviewRequestEmails({})).sent).toBe(1); // the next run sends it, once
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('r8 reviewer case: ten overlapping runs while a send is held — one send transaction, OFF still gets a connection and lands', async () => {
    const more = [randomUUID(), randomUUID()];
    for (const [i, id] of more.entries()) {
      const course = i === 0 ? ids.course2 : randomUUID();
      if (i === 1) {
        await watcher.query(
          "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Lock test 3', $3, 'published', 0)",
          [course, `lock-test-${course}`, ids.instructor]
        );
      }
      await watcher.query(
        "INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now() - interval '4 days')",
        [id, ids.learner, course]
      );
    }
    const hold = holdTheSend();
    const run1 = runReviewRequestEmails({});
    await hold.inSend;
    const heldAt = Date.now();
    // Nine more runs overlap the held send. Each finds the global send mutex taken and stops.
    const others = await Promise.all(Array.from({ length: 9 }, () => runReviewRequestEmails({})));
    expect(others.every((r) => r.sent === 0 && r.ambiguous === 0)).toBe(true);
    expect(others.some((r) => r.deferred_to_running_send === true)).toBe(true);
    // Only the held send keeps a transaction open through the provider call.
    const open = await watcher.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%' AND pid <> pg_backend_pid()"
    );
    expect(open.rows[0]!.n).toBeLessThanOrEqual(1);
    const off = setReviewRequestEmailsEnabled(false, adminSession());
    await waitForLockWaiters(1); // OFF has a connection and is queued behind the held send
    await sleep(Math.max(0, 7_000 - (Date.now() - heldAt)));
    hold.release();
    const [r1, saved] = await Promise.all([run1, off]);
    expect(saved.enabled).toBe(false);
    expect(r1.sent).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
    for (const id of more) expect(await ledgerStatus(id)).not.toBe('ambiguous');
  });

  it('r8 reviewer case: a revocation committed between the route check and the lock refuses the review', async () => {
    await writer.query('BEGIN');
    await writer.query(
      "UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1",
      [ids.enrolment]
    );
    const submit = upsertReview({
      courseId: ids.course,
      studentId: ids.learner,
      rating: 5,
      title: 'x',
      body: 'y',
    }).then(
      () => 'saved',
      (e: unknown) => e
    );
    await waitForLockWaiters(1); // the review transaction waits on the enrolment row lock
    await writer.query('COMMIT');
    expect(await submit).toBeInstanceOf(ReviewNotAllowedError);
    const reviews = await watcher.query(
      'SELECT 1 FROM lms_course_reviews WHERE course_id = $1 AND student_id = $2',
      [ids.course, ids.learner]
    );
    expect(reviews.rows).toHaveLength(0);
  });
});
