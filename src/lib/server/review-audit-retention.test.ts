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
       (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_id, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
     VALUES ($1, $2, $2, $3, $4, 'Water Damage Restoration', 1, 'hide', 'spam_or_fake', $5, 'lms_admin', $5, 'moderator@carsi.com.au', 1, $6)`,
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

  it('deleting the acting ADMIN keeps the event AND who made the decision (durable actor snapshot)', async () => {
    await db.query('DELETE FROM lms_users WHERE id = $1', [ids.admin]);
    expect(await events()).toMatchObject([{ review_id: ids.review, actor_id: null, reason: 'spam_or_fake' }]);
    const who = await db.query<{ actor_ref: string; actor_email: string }>(
      'SELECT actor_ref, actor_email FROM lms_course_review_moderation_events WHERE review_ref = $1',
      [ids.review]
    );
    expect(who.rows).toEqual([{ actor_ref: ids.admin, actor_email: 'moderator@carsi.com.au' }]);
  });

  it('the database refuses a moderation event with no actor snapshot', async () => {
    await expect(
      db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 9, 'unhide', NULL, 'admin_user', $3, '  ', 1, $4)`,
        [randomUUID(), ids.review, ids.course, 'e'.repeat(64)]
      )
    ).rejects.toThrow(/ck_lms_review_moderation_actor_email/);
  });

  it.each([
    ['a bootstrap admin with an account reference', 'bootstrap_admin', 'ref', null, /ck_lms_review_moderation_actor_ref/],
    ['an admin_users admin with no reference', 'admin_user', null, null, /ck_lms_review_moderation_actor_ref/],
    ['an LMS admin with no reference', 'lms_admin', null, null, /ck_lms_review_moderation_actor_ref/],
    ['a cookie admin with a live LMS link', 'admin_user', 'ref', 'admin', /ck_lms_review_moderation_actor_id_lms_only/],
    ['an unknown actor kind', 'anyone', 'ref', null, /ck_lms_review_moderation_actor_kind/],
  ])('r10: the database refuses %s', async (_label, kind, ref, actorId, error) => {
    await expect(
      db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_id, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 7, 'unhide', NULL, $4, $5, $6, 'm@carsi.com.au', 1, $7)`,
        [randomUUID(), ids.review, ids.course, actorId ? ids.admin : null, kind, ref ? randomUUID() : null, 'f'.repeat(64)]
      )
    ).rejects.toThrow(error);
  });

  it('r10: the bootstrap admin (no account row) and an admin_users admin are recorded as who decided', async () => {
    for (const [seq, kind, ref] of [
      [7, 'bootstrap_admin', null],
      [8, 'admin_user', randomUUID()],
    ] as const) {
      await db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_id, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', $4, 'unhide', NULL, NULL, $5, $6, 'support@carsi.com.au', 1, $7)`,
        [randomUUID(), ids.review, ids.course, seq, kind, ref, 'f'.repeat(64)]
      );
    }
    const rows = await db.query<{ actor_kind: string; has_ref: boolean }>(
      'SELECT actor_kind, actor_ref IS NOT NULL AS has_ref FROM lms_course_review_moderation_events WHERE review_ref = $1 AND sequence > 6 ORDER BY sequence',
      [ids.review]
    );
    expect(rows.rows).toEqual([
      { actor_kind: 'bootstrap_admin', has_ref: false },
      { actor_kind: 'admin_user', has_ref: true },
    ]);
  });

  it('the database still refuses a hide without a reason', async () => {
    await expect(
      db.query(
        `INSERT INTO lms_course_review_moderation_events
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 2, 'hide', NULL, 'admin_user', $3, 'm@carsi.com.au', 1, $4)`,
        [randomUUID(), ids.review, ids.course, 'b'.repeat(64)]
      )
    ).rejects.toThrow(/ck_lms_review_moderation_hide_has_reason/);
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
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256, created_at)
         VALUES ($1, $2, $2, $3, 's', 't', $4, $5, $6, 'admin_user', $3, 'm@carsi.com.au', 1, $7, $8)`,
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
           (id, review_id, review_ref, course_ref, course_slug, course_title, sequence, action, reason, actor_kind, actor_ref, actor_email, rating_at_action, content_sha256)
         VALUES ($1, $2, $2, $3, 's', 't', 1, 'unhide', NULL, 'admin_user', $3, 'm@carsi.com.au', 1, $4)`,
        [randomUUID(), ids.review, ids.course, 'd'.repeat(64)]
      )
    ).rejects.toThrow(/uq_lms_review_moderation_review_ref_sequence/);
  });
});

describe('the admin re-validation and review-write reads are valid on the real schema (release-gate r6-r8)', () => {
  it('runs resolveCurrentAdmin\'s reads and upsertReview\'s locked status read, in one transaction', async () => {
    const enrolment = randomUUID();
    await db.query("INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, 'completed', now())", [
      enrolment,
      ids.learner,
      ids.course,
    ]);
    await db.exec('BEGIN');
    try {
      await db.query('SELECT "id", "is_active", "role" FROM "admin_users" WHERE lower("email") = $1 FOR SHARE', ['ops@carsi.com.au']);
      const usr = await db.query('SELECT "id", "email", "is_active", "role" FROM "lms_users" WHERE "id" = $1::uuid FOR SHARE', [ids.admin]);
      await db.query(
        'SELECT r."name" FROM "lms_user_roles" ur JOIN "lms_roles" r ON r."id" = ur."role_id" WHERE ur."user_id" = $1::uuid FOR SHARE OF ur',
        [ids.admin]
      );
      const locked = await db.query<{ status: string }>(
        'SELECT "status" FROM "lms_enrollments" WHERE "student_id" = $1::uuid AND "course_id" = $2::uuid FOR NO KEY UPDATE',
        [ids.learner, ids.course]
      );
      expect(usr.rows).toHaveLength(1);
      expect(locked.rows).toEqual([{ status: 'completed' }]);
    } finally {
      await db.exec('ROLLBACK');
    }
  });
});

describe('the migration is additive and its documented down path is exact (release-gate split, amendment 11)', () => {
  const NAME = '20261018100000_review_moderation_audit';
  const reviewColumns = async (d: Db) =>
    (
      await d.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'lms_course_reviews' ORDER BY column_name"
      )
    ).rows.map((r) => r.column_name);
  const tables = async (d: Db) =>
    (await d.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).rows.map(
      (r) => r.tablename
    );

  it('creates no review-request email objects', async () => {
    const all = await tables(db);
    expect(all.filter((t) => t.startsWith('lms_review_request'))).toEqual([]);
    const triggers = await db.query("SELECT tgname FROM pg_trigger WHERE tgname LIKE '%review_request%'");
    expect(triggers.rows).toEqual([]);
  });

  it('up, then the documented down path, returns exactly the schema before it; up again applies cleanly', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const { PGlite } = (await import(require.resolve('@electric-sql/pglite'))) as { PGlite: new () => Db };
    const before = new PGlite();
    const fresh = new PGlite();
    try {
      const all = readdirSync(MIGRATIONS).filter((d) => /^\d/.test(d)).sort();
      expect(all).toContain(NAME);
      // The schema before it is every migration that sorts before it; later migrations
      // (e.g. GP-659) are not part of this round trip.
      for (const m of all.filter((d) => d < NAME)) {
        const sql = readFileSync(join(MIGRATIONS, m, 'migration.sql'), 'utf8');
        await before.exec(sql);
        await fresh.exec(sql);
      }
      const up = readFileSync(join(MIGRATIONS, NAME, 'migration.sql'), 'utf8');
      await fresh.exec(up);
      expect(await reviewColumns(fresh)).toContain('moderation_version');
      // The down path is the commented block in the migration header, executed verbatim.
      const down = [...up.matchAll(/^--   (DROP TABLE .*;|ALTER TABLE .*;)$/gm)].map((m) => m[1]!);
      expect(down).toEqual([
        'DROP TABLE "lms_course_review_moderation_events";',
        'ALTER TABLE "lms_course_reviews" DROP COLUMN "moderation_version";',
      ]);
      for (const stmt of down) await fresh.exec(stmt);
      expect(await tables(fresh)).toEqual(await tables(before));
      expect(await reviewColumns(fresh)).toEqual(await reviewColumns(before));
      await fresh.exec(up); // re-applies cleanly after a rollback
      expect(await tables(fresh)).toContain('lms_course_review_moderation_events');
    } finally {
      await before.close();
      await fresh.close();
    }
  });
});
