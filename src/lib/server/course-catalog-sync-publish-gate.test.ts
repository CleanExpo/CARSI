/**
 * GP-776: with LMS_SEED_AUTOCREATE=1, public pricing, checkout and enrolment routes call
 * getOrCreateCourseBySlug. It must never create a published course, and never rewrite or
 * republish a live one: publishing goes through review, a recorded approval and the gate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  existing: null as Row | null,
  creates: [] as Row[],
  updates: [] as Row[],
  moduleDeletes: 0,
}));

vi.mock('@/lib/lms-seed-catalog', () => ({
  getSeedCourseFull: (slug: string) =>
    slug === 'seed-course'
      ? {
          export: { title: 'Seed course', price_aud: 99, is_free: false },
          modules: [
            { title: 'M1', lessonTitle: 'L1', contentHtml: '<p>One</p>' },
            { title: 'M2', lessonTitle: 'L2', contentHtml: '<p>Two</p>' },
          ],
        }
      : null,
}));

vi.mock('@/lib/prisma', () => {
  const tx = {
    lmsModule: {
      deleteMany: vi.fn(async () => {
        db.moduleDeletes += 1;
        return { count: 1 };
      }),
      create: vi.fn(async () => ({})),
    },
    lmsLesson: { create: vi.fn(async () => ({})) },
    lmsCourse: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        db.creates.push(data);
        return data;
      }),
      update: vi.fn(async ({ data }: { data: Row }) => {
        db.updates.push(data);
        return data;
      }),
    },
  };
  return {
    prisma: {
      lmsUser: { findUnique: vi.fn(async () => ({ id: 'instructor' })), upsert: vi.fn() },
      lmsCourse: {
        findUnique: vi.fn(async () => db.existing),
        findUniqueOrThrow: vi.fn(async () => ({ id: 'reloaded' })),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

import { getOrCreateCourseBySlug } from './course-catalog-sync';

function row(status: string, isPublished: boolean): Row {
  // One module where the seed has two, so a resync is due.
  return { id: 'c1', slug: 'seed-course', status, isPublished, modules: [{ lessons: [{}] }], quizzes: [] };
}

beforeEach(() => {
  vi.stubEnv('LMS_SEED_AUTOCREATE', '1');
  db.existing = null;
  db.creates = [];
  db.updates = [];
  db.moduleDeletes = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe('seed autocreate never publishes', () => {
  it('creates a missing seed course as a draft', async () => {
    await getOrCreateCourseBySlug('seed-course');
    expect(db.creates).toHaveLength(1);
    expect(db.creates[0]).toMatchObject({ status: 'draft', isPublished: false });
  });

  it.each([
    ['published', true],
    ['draft', true],
  ])('leaves a live course (status %s, flag %s) untouched when the seed differs', async (status, flag) => {
    const live = row(status, flag);
    db.existing = live;
    await expect(getOrCreateCourseBySlug('seed-course')).resolves.toBe(live);
    expect(db.moduleDeletes).toBe(0);
    expect(db.updates).toHaveLength(0);
  });

  it('resyncs a draft course but keeps it a draft', async () => {
    db.existing = row('in_review', false);
    await getOrCreateCourseBySlug('seed-course');
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toMatchObject({ status: 'draft', isPublished: false });
  });
});
