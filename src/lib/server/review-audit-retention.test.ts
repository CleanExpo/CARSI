/**
 * Moderation audit retention against REAL PostgreSQL (release-gate r3 P1-MODERATION-AUDIT-CASCADE).
 *
 * Runs every repo migration, in order, on PGlite (PostgreSQL compiled to WebAssembly, installed
 * with Prisma's own dev tooling), then deletes through the actual foreign keys. Course deletion
 * cascades to reviews (existing migration 20260702230000), so an audit FK that cascaded with the
 * review would silently erase every moderation decision for that course. The audit must survive
 * review, course, learner and admin deletion.
 */
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

type Db = {
  exec(sql: string): Promise<unknown>;
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
};

let db: Db;
const MIGRATIONS = join(process.cwd(), 'prisma/migrations');

beforeAll(async () => {
  // Fail (never skip) if the engine is missing: a skipped retention test is not coverage.
  const require = createRequire(join(process.cwd(), 'package.json'));
  const { PGlite } = (await import(require.resolve('@electric-sql/pglite'))) as { PGlite: new () => Db };
  db = new PGlite();
  for (const m of readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, m, 'migration.sql'), 'utf8'));
  }
});
afterAll(async () => {
  await db?.close();
});

let ids: { admin: string; learner: string; instructor: string; course: string; review: string };

beforeEach(async () => {
  ids = { admin: randomUUID(), learner: randomUUID(), instructor: randomUUID(), course: randomUUID(), review: randomUUID() };
  for (const [id, email] of [
    [ids.admin, `admin-${ids.admin}@example.com`],
    [ids.learner, `learner-${ids.learner}@example.com`],
    [ids.instructor, `inst-${ids.instructor}@example.com`],
  ]) {
    await db.query('INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, $3)', [id, email, 'x']);
  }
  await db.query(
    "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Water Damage Restoration', $3, 'published', 0)",
    [ids.course, `water-damage-${ids.course}`, ids.instructor]
  );
  await db.query('INSERT INTO lms_course_reviews (id, course_id, student_id, rating, is_published) VALUES ($1, $2, $3, 1, false)', [
    ids.review,
    ids.course,
    ids.learner,
  ]);
  await db.query(
    `INSERT INTO lms_course_review_moderation_events
       (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_id, rating_at_action, content_sha256)
     VALUES ($1, $2, $2, $3, $4, 'Water Damage Restoration', 1, 'hide', 'spam_or_fake', $5, 1, $6)`,
    [randomUUID(), ids.review, ids.course, `water-damage-${ids.course}`, ids.admin, 'a'.repeat(64)]
  );
});

async function events() {
  const r = await db.query<{
    review_id: string | null;
    review_ref: string;
    course_ref: string;
    course_slug: string;
    actor_id: string | null;
    reason: string;
    rating_at_action: number;
  }>('SELECT review_id, review_ref, course_ref, course_slug, actor_id, reason, rating_at_action FROM lms_course_review_moderation_events WHERE review_ref = $1', [ids.review]);
  return r.rows;
}

describe('the moderation audit outlives what it judged (real PostgreSQL FKs)', () => {
  it('deleting the COURSE (which cascades to its reviews) keeps the event with its snapshots', async () => {
    await db.query('DELETE FROM lms_courses WHERE id = $1', [ids.course]);
    expect((await db.query('SELECT 1 FROM lms_course_reviews WHERE id = $1', [ids.review])).rows).toHaveLength(0);
    expect(await events()).toEqual([
      {
        review_id: null,
        review_ref: ids.review,
        course_ref: ids.course,
        course_slug: `water-damage-${ids.course}`,
        actor_id: ids.admin,
        reason: 'spam_or_fake',
        rating_at_action: 1,
      },
    ]);
  });

  it('deleting the REVIEW keeps the event', async () => {
    await db.query('DELETE FROM lms_course_reviews WHERE id = $1', [ids.review]);
    expect(await events()).toMatchObject([{ review_id: null, review_ref: ids.review, reason: 'spam_or_fake' }]);
  });

  it('deleting the LEARNER (which cascades to their review) keeps the event', async () => {
    await db.query('DELETE FROM lms_users WHERE id = $1', [ids.learner]);
    expect(await events()).toMatchObject([{ review_id: null, review_ref: ids.review, course_ref: ids.course }]);
  });

  it('deleting the acting ADMIN keeps the event, with the actor nulled', async () => {
    await db.query('DELETE FROM lms_users WHERE id = $1', [ids.admin]);
    expect(await events()).toMatchObject([{ review_id: ids.review, actor_id: null, reason: 'spam_or_fake' }]);
  });

  it('the database still refuses a hide without a reason', async () => {
    await expect(
      db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 2, 'hide', NULL, 1, $4)`,
        [randomUUID(), ids.review, ids.course, 'b'.repeat(64)]
      )
    ).rejects.toThrow(/ck_lms_review_moderation_hide_has_reason/);
  });

  it('only one review-request email ledger row can exist per enrolment', async () => {
    const enrolment = randomUUID();
    await db.query("INSERT INTO lms_enrollments (id, student_id, course_id, status) VALUES ($1, $2, $3, 'completed')", [
      enrolment,
      ids.learner,
      ids.course,
    ]);
    await db.query("INSERT INTO lms_review_request_emails (id, enrollment_id, status) VALUES ($1, $2, 'pending')", [randomUUID(), enrolment]);
    await expect(
      db.query("INSERT INTO lms_review_request_emails (id, enrollment_id, status) VALUES ($1, $2, 'pending')", [randomUUID(), enrolment])
    ).rejects.toThrow(/lms_review_request_emails_enrollment_id_key/);
  });
});

describe('moderation order is the decision sequence, never a timestamp (release-gate r4)', () => {
  /** Exactly what setReviewVisibility does: bump the version on the locked review row, store it. */
  async function decide(action: 'hide' | 'unhide', reason: string | null, createdAt: string) {
    await db.exec('BEGIN');
    try {
      const v = await db.query<{ moderation_version: number }>(
        'UPDATE lms_course_reviews SET is_published = $2, moderation_version = moderation_version + 1 WHERE id = $1 RETURNING moderation_version',
        [ids.review, action === 'unhide']
      );
      await db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, rating_at_action, content_sha256, created_at)
         VALUES ($1, $2, $2, $3, 's', 't', $4, $5, $6, 1, $7, $8)`,
        [randomUUID(), ids.review, ids.course, v.rows[0]!.moderation_version, action, reason, 'c'.repeat(64), createdAt]
      );
      await db.exec('COMMIT');
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }
  }
  async function latest() {
    const r = await db.query<{ action: string; reason: string | null; sequence: number }>(
      'SELECT action, reason, sequence FROM lms_course_review_moderation_events WHERE review_ref = $1 ORDER BY sequence DESC LIMIT 1',
      [ids.review]
    );
    return r.rows[0];
  }

  beforeEach(async () => {
    // Start each case from a clean history for this review (the outer beforeEach seeds one hide).
    await db.query('DELETE FROM lms_course_review_moderation_events WHERE review_ref = $1', [ids.review]);
  });

  it('equal timestamps: unhide then hide resolves to the hide, with its reason', async () => {
    const same = '2026-10-18T09:00:00.000Z';
    await decide('unhide', null, same);
    await decide('hide', 'offensive', same);
    expect(await latest()).toEqual({ action: 'hide', reason: 'offensive', sequence: 2 });
  });

  it('a later decision with an EARLIER timestamp (transactions that started in the other order) still wins', async () => {
    await decide('hide', 'spam_or_fake', '2026-10-18T09:00:05.000Z');
    await decide('unhide', null, '2026-10-18T09:00:01.000Z');
    expect(await latest()).toMatchObject({ action: 'unhide', sequence: 2 });
    const row = await db.query<{ is_published: boolean; moderation_version: number }>(
      'SELECT is_published, moderation_version FROM lms_course_reviews WHERE id = $1',
      [ids.review]
    );
    expect(row.rows[0]).toEqual({ is_published: true, moderation_version: 2 });
  });

  it('two decisions can never share a place in one review\'s order', async () => {
    await decide('hide', 'offensive', '2026-10-18T09:00:00.000Z');
    await expect(
      db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 1, 'unhide', NULL, 1, $4)`,
        [randomUUID(), ids.review, ids.course, 'd'.repeat(64)]
      )
    ).rejects.toThrow(/uq_lms_review_moderation_review_ref_sequence/);
  });
});

describe('review-request eligibility is decided at completion, in the database (release-gate r4)', () => {
  const setSwitch = (on: boolean) => db.query('UPDATE lms_review_request_settings SET enabled = $1 WHERE id = 1', [on]);
  async function newEnrolment(status = 'active', completedAt: string | null = null) {
    const id = randomUUID();
    const course = randomUUID();
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'C', $3, 'published', 0)",
      [course, `c-${course}`, ids.instructor]
    );
    await db.query('INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, $4, $5)', [
      id,
      ids.learner,
      course,
      status,
      completedAt,
    ]);
    return id;
  }
  const complete = (id: string) => db.query("UPDATE lms_enrollments SET status = 'completed', completed_at = now() WHERE id = $1", [id]);
  async function ledger(id: string) {
    return (await db.query<{ status: string }>('SELECT status FROM lms_review_request_emails WHERE enrollment_id = $1', [id])).rows;
  }

  beforeEach(async () => {
    await setSwitch(false);
  });

  it('the switch is created OFF by the migration', async () => {
    const r = await db.query<{ enabled: boolean }>('SELECT enabled FROM lms_review_request_settings WHERE id = 1');
    expect(r.rows).toEqual([{ enabled: false }]);
  });

  it('a completion while the switch is off is never marked eligible', async () => {
    const e = await newEnrolment();
    await complete(e);
    expect(await ledger(e)).toEqual([]);
  });

  it('a completion while the switch is on is marked eligible (update path)', async () => {
    await setSwitch(true);
    const e = await newEnrolment();
    await complete(e);
    expect(await ledger(e)).toEqual([{ status: 'eligible' }]);
  });

  it('a completion inserted already completed (CCW provisioning, admin, scripts) is marked too', async () => {
    await setSwitch(true);
    const e = await newEnrolment('completed', '2026-10-18T02:00:00Z');
    expect(await ledger(e)).toEqual([{ status: 'eligible' }]);
  });

  it('r4 reviewer scenario: on, off (1 h), completion while off, back on — never eligible, whatever the cron does', async () => {
    await setSwitch(true);
    const before = await newEnrolment();
    await complete(before); // completed while on → eligible
    await setSwitch(false);
    const whileOff = await newEnrolment();
    await complete(whileOff); // completed during the off hour
    await setSwitch(true);
    expect(await ledger(before)).toEqual([{ status: 'eligible' }]);
    expect(await ledger(whileOff)).toEqual([]);
  });

  it('later changes to a completed enrolment never mark it (only the moment completed_at is first set counts)', async () => {
    const e = await newEnrolment();
    await complete(e); // off
    await setSwitch(true);
    await db.query("UPDATE lms_enrollments SET certificate_issued_at = now(), last_accessed_lesson_id = NULL WHERE id = $1", [e]);
    await db.query('UPDATE lms_enrollments SET completed_at = completed_at + interval \'1 minute\' WHERE id = $1', [e]);
    expect(await ledger(e)).toEqual([]);
  });

  it('a revoked then re-completed enrolment, re-completed while on, is a new completion and is marked once', async () => {
    const e = await newEnrolment();
    await complete(e); // off
    await db.query("UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1", [e]);
    await setSwitch(true);
    await complete(e);
    await db.query("UPDATE lms_enrollments SET status = 'revoked', completed_at = NULL WHERE id = $1", [e]);
    await complete(e);
    expect(await ledger(e)).toEqual([{ status: 'eligible' }]);
  });
});
