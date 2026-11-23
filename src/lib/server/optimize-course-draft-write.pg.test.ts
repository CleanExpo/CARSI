/**
 * Optimiser cron draft write on a REAL PostgreSQL (GP-758).
 *
 * The cron path generates a rewrite for minutes, then stores it as `meta.optimizeDraft`. These
 * tests run the real cron entry point (`draftCourseOptimizationForReview`), the real SQL in
 * `persistOptimizeDraft` and the real row. While the model is "writing", a second connection
 * changes the row the way an admin would. Proves:
 *   - an admin draft saved mid-generation is kept, and the cron run is refused;
 *   - a `meta.noAiRewrite` lock set mid-generation is kept, and the cron run is refused;
 *   - a malformed draft already in the row blocks the run before any model call;
 *   - a meta key added mid-generation is kept when the cron draft is stored;
 *   - live course columns and modules are never changed.
 *
 * Only the model call is replaced. The admin read service is a thin stand-in that reads the real
 * row, because the optimiser needs a legacy curriculum DTO this fixture does not build.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. Locally
 * it needs CARSI_PG_DISPOSABLE=1 and a loopback DATABASE_URL, or it is skipped ("runs in CI").
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

const model = vi.hoisted(() => ({ duringGeneration: null as null | (() => Promise<void>) }));

const MODULE_BODY = [
  'A carpet in a rental unit has been wet for two days after a washing machine hose failed. The technician starts by walking the room with a moisture meter and marking the wet edge on the floor plan.',
  '"How long before we can put the furniture back?" the tenant asks. The technician explains that drying depends on the readings, not on a fixed number of days, and books a follow-up visit.',
  'On the next visit the readings are compared with a dry reference area in the same unit. The technician records each reading on the job sheet so the insurer can see the trend over time.',
  'Before leaving site the technician checks every air mover lead is on a 10 A GPO with an RCD, photographs the setup and leaves the tenant a short note about what happens next.',
].join('\n\n');

vi.mock('./anthropic-client', () => ({
  resolveAnthropicConfig: () => ({ configured: true }),
  anthropicComplete: vi.fn(async () => {
    const hook = model.duringGeneration;
    model.duringGeneration = null;
    if (hook) await hook();
    return MODULE_BODY;
  }),
  AnthropicAPIError: class extends Error {},
}));

vi.mock('@/lib/admin/admin-courses-service', async () => {
  const { prisma } = await import('@/lib/prisma');
  return {
    adminGetCourse: async (id: string) => {
      const row = await prisma.lmsCourse.findUnique({ where: { id } });
      return row ? { ...row, modules: [] } : null;
    },
    adminUpdateCourse: vi.fn(async () => {
      throw new Error('the cron path must never update a live course');
    }),
    courseToAdminDto: (course: { id: string; title: string; isFree: boolean }) => ({
      id: course.id,
      title: course.title,
      description: 'Drying a wet carpet in an Australian rental property.',
      priceAud: 0,
      isFree: course.isFree,
      published: true,
      modules: Array.from({ length: 9 }, (_, i) => ({
        id: `module-${i + 1}`,
        title: i === 8 ? 'What you learnt' : `Existing module ${i + 1}`,
        textContent: `<p>Original live text for module ${i + 1}.</p>`,
      })),
    }),
  };
});

if (!RUNNABLE) {
  describe('optimiser cron draft write (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('optimiser cron draft write (real PostgreSQL)', () => {
  let optimiser: typeof import('./optimize-course-content');
  const admin = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const instructorId = randomUUID();
  let courseId: string;

  const LIVE_COLUMNS =
    'title, description, price_aud, is_free, status, is_published, cec_hours, duration_hours';

  async function readRow(): Promise<Record<string, unknown>> {
    const r = await admin.query(`SELECT ${LIVE_COLUMNS}, meta FROM lms_courses WHERE id = $1`, [
      courseId,
    ]);
    return r.rows[0] as Record<string, unknown>;
  }

  async function setMeta(meta: unknown): Promise<void> {
    await admin.query('UPDATE lms_courses SET meta = $2::jsonb WHERE id = $1', [
      courseId,
      JSON.stringify(meta),
    ]);
  }

  beforeAll(async () => {
    await admin.connect();
    optimiser = await import('./optimize-course-content');
    await admin.query(
      "INSERT INTO lms_users (id, email, hashed_password, role) VALUES ($1, $2, 'x', NULL)",
      [instructorId, `inst-${run}@optimiser-draft.invalid`]
    );
  });

  beforeEach(async () => {
    model.duringGeneration = null;
    courseId = randomUUID();
    await admin.query(
      "INSERT INTO lms_courses (id, slug, title, description, instructor_id, status, price_aud, is_free, is_published, meta) VALUES ($1, $2, 'Optimiser draft course', 'Live description', $3, 'published', 49, false, true, $4::jsonb)",
      [courseId, `optimiser-draft-${run}-${courseId.slice(0, 8)}`, instructorId, '{"keep":"yes"}']
    );
  });

  afterAll(async () => {
    await admin.query('DELETE FROM lms_courses WHERE instructor_id = $1', [instructorId]);
    await admin.query('DELETE FROM lms_users WHERE id = $1', [instructorId]);
    await admin.end();
  });

  it('stores the draft and keeps a meta key added while the model was writing', async () => {
    const before = await readRow();
    model.duringGeneration = () => setMeta({ keep: 'yes', addedMidRun: 1 });

    const result = await optimiser.draftCourseOptimizationForReview(courseId);

    const after = await readRow();
    const { meta, ...live } = after;
    const { meta: _beforeMeta, ...liveBefore } = before;
    expect(live).toEqual(liveBefore);
    const { optimizeDraft, ...rest } = meta as Record<string, unknown>;
    expect(rest).toEqual({ keep: 'yes', addedMidRun: 1 });
    expect(optimizeDraft).toMatchObject({ modules: expect.any(Array) });
    expect(result.moduleCount).toBeGreaterThan(0);
  });

  it('refuses, and keeps the admin draft, when one is saved mid-generation', async () => {
    const adminDraft = {
      token: 'admin-draft',
      generatedAt: '2026-11-22T00:00:00.000Z',
      title: 'Optimiser draft course',
      description: '',
      modules: [{ title: 'Admin module', textContent: 'Admin draft text.' }],
    };
    model.duringGeneration = () => setMeta({ keep: 'yes', optimizeDraft: adminDraft });

    await expect(optimiser.draftCourseOptimizationForReview(courseId)).rejects.toMatchObject({
      status: 409,
    });
    expect((await readRow()).meta).toEqual({ keep: 'yes', optimizeDraft: adminDraft });
  });

  it('refuses, and keeps the lock, when noAiRewrite is set mid-generation', async () => {
    model.duringGeneration = () => setMeta({ keep: 'yes', noAiRewrite: true });

    await expect(optimiser.draftCourseOptimizationForReview(courseId)).rejects.toMatchObject({
      status: 409,
    });
    expect((await readRow()).meta).toEqual({ keep: 'yes', noAiRewrite: true });
  });

  it('treats a malformed draft as waiting and leaves the row untouched', async () => {
    const malformed = { keep: 'yes', optimizeDraft: { token: 't', modules: [] } };
    await setMeta(malformed);

    await expect(optimiser.draftCourseOptimizationForReview(courseId)).rejects.toMatchObject({
      status: 409,
    });
    expect((await readRow()).meta).toEqual(malformed);
  });

  it('the conditional write itself refuses a malformed draft and a lock', async () => {
    const draft = {
      token: 'cron',
      generatedAt: '2026-11-22T00:00:00.000Z',
      title: 'x',
      description: '',
      modules: [{ title: 'M', textContent: 'Text.' }],
    };
    for (const meta of [
      { optimizeDraft: { broken: true } },
      { optimizeDraft: 'not an object' },
      { noAiRewrite: true },
    ]) {
      await setMeta(meta);
      expect(
        await optimiser.persistOptimizeDraft(courseId, draft, { onlyIfNoPendingDraft: true })
      ).toBe(false);
      expect((await readRow()).meta).toEqual(meta);
    }
    for (const meta of [null, { optimizeDraft: null }, { noAiRewrite: false }]) {
      await setMeta(meta);
      expect(
        await optimiser.persistOptimizeDraft(courseId, draft, { onlyIfNoPendingDraft: true })
      ).toBe(true);
      expect((await readRow()).meta).toMatchObject({ optimizeDraft: { token: 'cron' } });
    }
  });
});
