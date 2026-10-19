import { Prisma } from '@/generated/prisma/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), findMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: mocks.queryRaw, lmsUser: { findMany: mocks.findMany } },
}));

import { getDesignationDefinition } from '@/lib/designations/registry';

import { iicrcCodes } from '../../../scripts/lib/iicrc-codes-shim.mjs';

import { GET } from '../../../app/api/lms/gamification/leaderboard/route';

/**
 * The monthly leaderboard used to filter by IICRC discipline code (`?discipline=WRT`, matched
 * against lms_courses.iicrc_discipline). CARSI courses are never branded with those acronyms and
 * designation-era courses carry iicrcDiscipline null, so the filter both broke the designation
 * rule and matched nothing. The filter is now a CARSI designation: its pathway courses.
 */
const SLUG = 'carsi-water-restoration-practitioner';
const PATHWAY = getDesignationDefinition(SLUG)!.pathwaySteps.map((s) => s.courseSlug);

type Captured = { sql: string; values: unknown[] };
let captured: Captured[] = [];

function req(query: string) {
  return new NextRequest(`http://localhost/api/lms/gamification/leaderboard${query}`);
}

beforeEach(() => {
  captured = [];
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.findMany.mockResolvedValue([]);
  mocks.queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = Prisma.sql(strings, ...(values as Prisma.Sql[]));
    captured.push({ sql: q.sql, values: q.values });
    if (/date_trunc/.test(q.sql)) {
      return Promise.resolve([
        { start: new Date('2026-09-30T14:00:00Z'), end: new Date('2026-10-31T13:00:00Z') },
      ]);
    }
    if (/lms_lesson_progress/.test(q.sql))
      return Promise.resolve([{ student_id: 'aaaa-1111', xp: 30n }]);
    return Promise.resolve([]);
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const xpQueries = () => captured.filter((c) => /lms_lesson_progress|lms_enrollments/.test(c.sql));

describe('leaderboard filters by CARSI designation, never an IICRC discipline code', () => {
  it('filters the period XP queries to the designation pathway courses', async () => {
    const res = await GET(req(`?designation=${SLUG}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.designation).toBe(SLUG);
    expect(body).not.toHaveProperty('discipline');
    expect(body.items).toHaveLength(1);

    const filtered = xpQueries().filter((q) => /c\.slug IN/.test(q.sql));
    expect(filtered).toHaveLength(2); // lesson + course XP for the period
    for (const q of filtered) expect(q.values).toEqual(expect.arrayContaining(PATHWAY));
  });

  it('never queries iicrc_discipline, whatever the caller sends', async () => {
    await GET(req('?discipline=WRT'));
    await GET(req(`?designation=${SLUG}`));
    await GET(req(''));
    expect(captured.length).toBeGreaterThan(0);
    for (const q of captured) expect(q.sql).not.toMatch(/iicrc_discipline/);
  });

  it('applies no course filter when no designation is given', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(200);
    expect((await res.json()).designation).toBeNull();
    for (const q of xpQueries()) expect(q.sql).not.toMatch(/c\.slug IN/);
  });

  it.each([
    ['legacy IICRC code as discipline', '?discipline=WRT'],
    // Review r2 of 6ebd8e85: get('discipline') is falsy for these, so they were served unfiltered.
    ['an empty legacy discipline', '?discipline='],
    ['a bare legacy discipline key', '?discipline'],
    ['an empty legacy discipline beside a valid designation', `?designation=${SLUG}&discipline=`],
    ['an empty designation', '?designation='],
    ['a bare designation key', '?designation'],
    ['IICRC code as designation', '?designation=WRT'],
    ['unknown designation', '?designation=not-a-designation'],
  ])('rejects %s with 400 and no IICRC acronym in the message', async (_label, query) => {
    const res = await GET(req(query));
    expect(res.status).toBe(400);
    const { detail } = await res.json();
    expect(detail).not.toMatch(new RegExp(`\\b(?:${iicrcCodes().join('|')})\\b`));
    expect(captured).toHaveLength(0);
  });
});
