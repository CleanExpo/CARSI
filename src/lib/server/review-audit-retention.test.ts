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
       (id, review_id, review_ref, course_ref, course_slug, course_title, action, reason, actor_id, rating_at_action, content_sha256)
     VALUES ($1, $2, $2, $3, $4, 'Water Damage Restoration', 'hide', 'spam_or_fake', $5, 1, $6)`,
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
           (id, review_id, review_ref, course_ref, course_slug, course_title, action, reason, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 'hide', NULL, 1, $4)`,
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
