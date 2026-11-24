import { Prisma } from '@/generated/prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mocks.queryRaw } }));

import { courseXpGrouped, lessonXpGrouped } from './leaderboard-xp';
import { getLearnerLevelPayload } from './learner-xp';
import { SQL_XP_ELIGIBLE } from './xp-eligibility';

/**
 * Learning OS register row 2: XP, the leaderboard and the streak read ONE eligibility rule
 * (xp-eligibility.ts). This proves every query shape carries it, including each period and
 * course-filter combination, so a new branch cannot quietly skip it. The behaviour itself
 * (refunded, revoked and unpublished earn nothing) is proven on real PostgreSQL in
 * xp-eligibility.pg.test.ts.
 */

const captured: Prisma.Sql[] = [];

beforeEach(() => {
  captured.length = 0;
  mocks.queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    captured.push(Prisma.sql(strings, ...(values as Prisma.Sql[])));
    return Promise.resolve([]);
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

function expectRule(q: Prisma.Sql) {
  expect(q.sql).toContain(SQL_XP_ELIGIBLE.sql);
  expect(q.sql).toMatch(/INNER JOIN lms_courses c ON c\.id = /);
  expect(q.values).toEqual(expect.arrayContaining(['active', 'completed']));
  expect(q.values).not.toContain('revoked');
}

const start = new Date('2026-10-31T13:00:00Z');
const end = new Date('2026-11-30T13:00:00Z');
const shapes: Array<[string, Date | null, Date | null, string[] | null]> = [
  ['lifetime, all courses', null, null, null],
  ['lifetime, one pathway', null, null, ['water-damage']],
  ['this month, all courses', start, end, null],
  ['this month, one pathway', start, end, ['water-damage']],
];

describe('one XP eligibility rule', () => {
  it.each(shapes)('lesson XP carries the rule (%s)', async (_label, s, e, slugs) => {
    await lessonXpGrouped(s, e, slugs);
    expect(captured).toHaveLength(1);
    expectRule(captured[0]!);
    expect(captured[0]!.sql).toMatch(
      /INNER JOIN lms_enrollments e ON e\.student_id = lp\.student_id AND e\.course_id = c\.id/
    );
  });

  it.each(shapes)('course XP carries the rule (%s)', async (_label, s, e, slugs) => {
    await courseXpGrouped(s, e, slugs);
    expect(captured).toHaveLength(1);
    expectRule(captured[0]!);
  });

  it('the streak reads the same rule as the XP totals', async () => {
    await getLearnerLevelPayload('10000000-0000-4000-8000-00000000aaa1');
    const streak = captured.find((q) => /AT TIME ZONE 'Australia\/Sydney'\)::date/.test(q.sql));
    expect(streak).toBeDefined();
    expectRule(streak!);
    expect(captured.every((q) => q.sql.includes(SQL_XP_ELIGIBLE.sql))).toBe(true);
  });

  it('the rule allows exactly the access-granting statuses and a published course', () => {
    expect(SQL_XP_ELIGIBLE.sql).toBe("e.status IN (?,?) AND lower(c.status) = 'published'");
    expect(SQL_XP_ELIGIBLE.values).toEqual(['active', 'completed']);
  });
});
