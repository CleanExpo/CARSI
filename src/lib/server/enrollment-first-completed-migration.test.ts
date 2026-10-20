/**
 * GP-659 migration (20261020120000_enrollment_first_completed_at), run on PGlite (PostgreSQL in
 * WebAssembly) after every earlier repo migration, with rows seeded before it applies:
 *  - a completed enrolment keeps its completion as the first completion;
 *  - a revoked enrolment (completed_at already cleared) whose learner completed every lesson gets
 *    the latest lesson completion time;
 *  - a revoked enrolment with an unfinished lesson, and an active one, stay null;
 *  - the documented down path removes the column and the migration re-applies.
 */
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

type Db = {
  exec(sql: string): Promise<unknown>;
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
};

const MIGRATIONS = join(process.cwd(), 'prisma/migrations');
const NAME = '20261020120000_enrollment_first_completed_at';
const UP = readFileSync(join(MIGRATIONS, NAME, 'migration.sql'), 'utf8');

let db: Db;
const id = {
  instructor: randomUUID(),
  learner: randomUUID(),
  course: randomUUID(),
  module: randomUUID(),
  l1: randomUUID(),
  l2: randomUUID(),
  completed: randomUUID(),
  revokedDone: randomUUID(),
  revokedPartial: randomUUID(),
  active: randomUUID(),
};
const learners = { revokedDone: randomUUID(), revokedPartial: randomUUID(), active: randomUUID() };

beforeAll(async () => {
  // Fail (never skip) if the engine is missing: a skipped migration test is not coverage.
  const require = createRequire(join(process.cwd(), 'package.json'));
  const { PGlite } = (await import(require.resolve('@electric-sql/pglite'))) as {
    PGlite: new () => Db;
  };
  db = new PGlite();
  const earlier = readdirSync(MIGRATIONS)
    .filter((d) => /^\d/.test(d) && d < NAME)
    .sort();
  for (const m of earlier)
    await db.exec(readFileSync(join(MIGRATIONS, m, 'migration.sql'), 'utf8'));

  for (const u of [id.instructor, id.learner, ...Object.values(learners)]) {
    await db.query('INSERT INTO lms_users (id, email, hashed_password) VALUES ($1, $2, $3)', [
      u,
      `u-${u}@example.com`,
      'x',
    ]);
  }
  await db.query(
    "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'Water', $3, 'published', 0)",
    [id.course, `water-${id.course}`, id.instructor]
  );
  await db.query(
    "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'M', 0)",
    [id.module, id.course]
  );
  for (const [lesson, i] of [
    [id.l1, 0],
    [id.l2, 1],
  ] as const) {
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, order_index) VALUES ($1, $2, 'L', 'text', $3)",
      [lesson, id.module, i]
    );
  }
  const enrol = (eid: string, student: string, status: string, completedAt: string | null) =>
    db.query(
      'INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, $4, $5)',
      [eid, student, id.course, status, completedAt]
    );
  const progress = (student: string, lesson: string, completed: boolean, at: string | null) =>
    db.query(
      'INSERT INTO lms_lesson_progress (id, student_id, lesson_id, completed, completed_at) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), student, lesson, completed, at]
    );

  await enrol(id.completed, id.learner, 'completed', '2025-06-01T00:00:00Z');
  await enrol(id.revokedDone, learners.revokedDone, 'revoked', null);
  await progress(learners.revokedDone, id.l1, true, '2025-05-01T00:00:00Z');
  await progress(learners.revokedDone, id.l2, true, '2025-05-20T00:00:00Z');
  await enrol(id.revokedPartial, learners.revokedPartial, 'revoked', null);
  await progress(learners.revokedPartial, id.l1, true, '2025-05-01T00:00:00Z');
  await progress(learners.revokedPartial, id.l2, false, null);
  await enrol(id.active, learners.active, 'active', null);

  await db.exec(UP);
});

afterAll(async () => {
  await db?.close();
});

async function first(eid: string): Promise<string | null> {
  const r = await db.query<{ first_completed_at: Date | null }>(
    'SELECT first_completed_at FROM lms_enrollments WHERE id = $1',
    [eid]
  );
  const at = r.rows[0]?.first_completed_at;
  return at ? new Date(at).toISOString() : null;
}

describe('GP-659 first_completed_at migration', () => {
  it('a completed enrolment keeps its completion as the first completion', async () => {
    expect(await first(id.completed)).toBe('2025-06-01T00:00:00.000Z');
  });

  it('a revoked enrolment with every lesson done gets the latest lesson completion', async () => {
    expect(await first(id.revokedDone)).toBe('2025-05-20T00:00:00.000Z');
  });

  it('a revoked enrolment with an unfinished lesson, and an active one, stay null', async () => {
    expect(await first(id.revokedPartial)).toBeNull();
    expect(await first(id.active)).toBeNull();
  });

  it('the documented down path removes the column and the migration re-applies', async () => {
    const down = [...UP.matchAll(/^-- Down path: (ALTER TABLE .*;)$/gm)].map((m) => m[1]!);
    expect(down).toEqual(['ALTER TABLE "lms_enrollments" DROP COLUMN "first_completed_at";']);
    await db.exec(down[0]!);
    const cols = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'lms_enrollments'"
    );
    expect(cols.rows.map((c) => c.column_name)).not.toContain('first_completed_at');
    await db.exec(UP);
    expect(await first(id.completed)).toBe('2025-06-01T00:00:00.000Z');
  });
});
