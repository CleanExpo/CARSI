/**
 * GP-776 course publish gate on a REAL PostgreSQL: the migration, its CHECK constraints, the
 * row lock, and the approve -> publish flow through the real service and Prisma.
 *
 * The ledger and visuals checks read a fixture repository root (process.cwd is pointed at it);
 * everything else is real. Runs in CI's E2E job (`npm run test:pg`) against its migrated
 * postgres:16 service. Locally it needs a disposable loopback database (CARSI_PG_DISPOSABLE=1).
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('course publish gate (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('course publish gate (real PostgreSQL)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let service: typeof import('./admin-courses-service');
  const client = new pg.Client({ connectionString: DB_URL });
  const watcher = new pg.Client({ connectionString: DB_URL });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gp776-pg-'));
  let ids: { instructor: string; course: string; module: string; lesson: string };
  const slug = () => `gp776-gate-${ids.course.slice(0, 8)}`;

  beforeAll(async () => {
    await Promise.all([client.connect(), watcher.connect()]);
    ({ prisma } = await import('@/lib/prisma'));
    service = await import('./admin-courses-service');
  });

  afterAll(async () => {
    await prisma?.$disconnect().catch(() => {});
    await Promise.all([client.end(), watcher.end()].map((p) => p.catch(() => {})));
    fs.rmSync(root, { recursive: true, force: true });
  });

  beforeEach(async () => {
    ids = { instructor: randomUUID(), course: randomUUID(), module: randomUUID(), lesson: randomUUID() };
    const s = slug();
    const evidence = path.join(root, 'data/courses', s, 'evidence');
    fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(
      path.join(evidence, 'evidence-ledger.jsonl'),
      JSON.stringify({
        id: 'G-001', claim: 'Set drying goals from a dry reference.', claim_class: 'technical',
        surface: `course:${s}`, status: 'VERIFIED', feeds: [s], source_url: 'https://www.example.gov.au/drying',
        access_date: '2026-11-01', quote: 'Set drying goals from a dry reference.',
      }) + '\n'
    );
    const pub = path.join(root, 'public/courses', s);
    fs.mkdirSync(path.join(pub, 'diagrams'), { recursive: true });
    fs.writeFileSync(path.join(pub, 'cover.png'), 'png');
    fs.writeFileSync(path.join(pub, 'l1.png'), 'png');
    fs.writeFileSync(path.join(pub, 'diagrams/d1.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    await watcher.query(
      "INSERT INTO lms_users (id, email, hashed_password, role) VALUES ($1, $2, 'x', NULL)",
      [ids.instructor, `inst-${ids.instructor}@gate-test.invalid`]
    );
    await watcher.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud, is_published, thumbnail_url) VALUES ($1, $2, 'Drying goals', $3, 'in_review', 99, false, $4)",
      [ids.course, s, ids.instructor, `/courses/${s}/cover.png`]
    );
    await watcher.query("INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'Goals', 0)", [
      ids.module,
      ids.course,
    ]);
    await watcher.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, content_body, order_index) VALUES ($1, $2, 'Dry reference', 'text', $3, 0)",
      [
        ids.lesson,
        ids.module,
        `<p>Measure first.</p><img src="/courses/${s}/l1.png" alt="Meter"><img src="/courses/${s}/diagrams/d1.svg" alt="Goal">`,
      ]
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await client.query('ROLLBACK').catch(() => {});
    await watcher.query('DELETE FROM lms_course_approvals WHERE course_ref = $1', [ids.course]);
    await watcher.query('DELETE FROM lms_courses WHERE id = $1', [ids.course]);
    await watcher.query('DELETE FROM lms_users WHERE id = $1', [ids.instructor]);
  });

  const rows = async () =>
    (
      await watcher.query<{ id: string; action: string; actor_email: string; approval_ref: string | null; content_sha256: string }>(
        'SELECT id, action, actor_email, approval_ref, content_sha256 FROM lms_course_approvals WHERE course_ref = $1 ORDER BY created_at',
        [ids.course]
      )
    ).rows;
  const courseRow = async () =>
    (await watcher.query<{ status: string; is_published: boolean }>('SELECT status, is_published FROM lms_courses WHERE id = $1', [ids.course])).rows[0]!;

  it('publish without an approval is refused and writes nothing', async () => {
    await expect(service.adminTransitionCourseWorkflow(ids.course, 'publish', 'publisher@gate-test.invalid')).rejects.toMatchObject({
      blockers: [expect.objectContaining({ check: 'approval' })],
    });
    expect(await courseRow()).toEqual({ status: 'in_review', is_published: false });
    expect(await rows()).toHaveLength(0);
  });

  it('approve then publish records the approver and the publisher', async () => {
    await expect(service.adminTransitionCourseWorkflow(ids.course, 'approve', 'reviewer@gate-test.invalid')).resolves.toBe('in_review');
    await expect(service.adminTransitionCourseWorkflow(ids.course, 'publish', 'publisher@gate-test.invalid')).resolves.toBe('published');
    expect(await courseRow()).toEqual({ status: 'published', is_published: true });
    const [approve, publish] = await rows();
    expect(approve).toMatchObject({ action: 'approve', actor_email: 'reviewer@gate-test.invalid', approval_ref: null });
    expect(publish).toMatchObject({ action: 'publish', actor_email: 'publisher@gate-test.invalid', approval_ref: approve!.id,
      content_sha256: approve!.content_sha256 });
  });

  it('an edit committed while publish waits on the row lock invalidates the approval', async () => {
    await service.adminTransitionCourseWorkflow(ids.course, 'approve', 'reviewer@gate-test.invalid');
    await client.query('BEGIN');
    await client.query('SELECT id FROM lms_courses WHERE id = $1 FOR UPDATE', [ids.course]);
    const publishing = service.adminTransitionCourseWorkflow(ids.course, 'publish', 'publisher@gate-test.invalid');
    const settled = publishing.then(() => 'resolved', () => 'rejected');
    const deadline = Date.now() + 15_000;
    for (;;) {
      const r = await watcher.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'"
      );
      if (r.rows[0]!.n >= 1) break;
      if (Date.now() > deadline) throw new Error('publish never waited on the course row lock');
      await new Promise((res) => setTimeout(res, 25));
    }
    await client.query("UPDATE lms_courses SET title = 'Drying goals, rewritten' WHERE id = $1", [ids.course]);
    await client.query('COMMIT');
    expect(await settled).toBe('rejected');
    await expect(publishing).rejects.toMatchObject({ blockers: [expect.objectContaining({ check: 'approval' })] });
    expect(await courseRow()).toEqual({ status: 'in_review', is_published: false });
  });

  it('the database refuses a publish row with no approval and an unknown action', async () => {
    const sha = 'a'.repeat(64);
    await expect(
      watcher.query(
        "INSERT INTO lms_course_approvals (id, course_ref, course_slug, action, actor_email, content_sha256) VALUES ($1, $2, $3, 'publish', 'x@gate-test.invalid', $4)",
        [randomUUID(), ids.course, slug(), sha]
      )
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      watcher.query(
        "INSERT INTO lms_course_approvals (id, course_ref, course_slug, action, actor_email, content_sha256) VALUES ($1, $2, $3, 'auto', 'x@gate-test.invalid', $4)",
        [randomUUID(), ids.course, slug(), sha]
      )
    ).rejects.toMatchObject({ code: '23514' });
  });
});
