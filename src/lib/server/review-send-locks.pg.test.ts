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
 *   - a concurrent completion, revoke and switch change during a send finish without deadlock.
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
  let prisma: typeof import('@/lib/prisma').prisma;
  const writer = new pg.Client({ connectionString: DB_URL });
  const writer2 = new pg.Client({ connectionString: DB_URL });
  const watcher = new pg.Client({ connectionString: DB_URL });
  let ids: {
    learner: string;
    instructor: string;
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
    ({ runReviewRequestEmails } = await import('./review-request-email'));
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
      course: randomUUID(),
      course2: randomUUID(),
      enrolment: randomUUID(),
    };
    await watcher.query(
      "INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, 'x'), ($3, $4, 'x')",
      [
        ids.learner,
        `learner-${ids.learner}@lock-test.invalid`,
        ids.instructor,
        `inst-${ids.instructor}@lock-test.invalid`,
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
    await watcher.query('DELETE FROM lms_courses WHERE id = ANY($1::uuid[])', [
      [ids.course, ids.course2],
    ]);
    await watcher.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [
      [ids.learner, ids.instructor],
    ]);
    await watcher.query('UPDATE lms_review_request_settings SET enabled = false WHERE id = 1');
  });

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
    // Session 2: an admin switching off (waits for the send and for session 1's shared lock).
    const session2 = writer2.query(
      'UPDATE lms_review_request_settings SET enabled = false WHERE id = 1'
    );
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
});
