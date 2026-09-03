import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsCourse: { findMany } },
}));

import {
  canSeeDraftCourses,
  effectiveDashboardCourseStatus,
  getDashboardCourseListItemsFromDatabase,
  lmsPublishedCourseWhere,
  type DashboardCourseStatusFilter,
} from './public-courses-list';

/**
 * WS1 fix 3 (GP-542, directive break 4). Observed live on carsi.com.au on 2026-09-03: a fresh
 * free learner's dashboard catalogue showed "112 courses" with a Draft tab and 32 cards badged
 * DRAFT, because the page honoured the `status` query for every role and the server call ran
 * whatever it was given. Drafts are unfinished content and must never reach a learner.
 *
 * The enforcement lives in the server call, not the page: whatever status is requested, a
 * session that may not see drafts gets the published query only. These tests drive the real
 * function against a mocked Prisma client and read back the `where` it actually used.
 */

const DRAFT_WHERE = { status: { equals: 'draft', mode: 'insensitive' } };
const STATUSES: readonly DashboardCourseStatusFilter[] = ['all', 'draft', 'published'];
const PRIVILEGED = ['admin', 'instructor', 'Admin', ' INSTRUCTOR '];
const LEARNERS = [undefined, null, '', ' ', 'student', 'learner', 'owner', 'user', 'guest', 'administrator', 'instructors', 'admin_assistant'];

function whereArgs(): unknown[] {
  return findMany.mock.calls.map((call) => (call[0] as { where: unknown }).where);
}

beforeEach(() => {
  findMany.mockClear();
  process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test';
  delete process.env.NEXT_PHASE;
});

describe('who may see draft courses', () => {
  it('admins and instructors may, in any case and with stray spaces', () => {
    for (const role of PRIVILEGED) expect(canSeeDraftCourses(role), role).toBe(true);
  });

  it('every other role, and no role at all, may not (fail closed)', () => {
    for (const role of LEARNERS) expect(canSeeDraftCourses(role), String(role)).toBe(false);
  });

  it('a learner is coerced to published whatever was requested; a privileged role keeps its request', () => {
    for (const status of STATUSES) {
      for (const role of LEARNERS) expect(effectiveDashboardCourseStatus(status, role)).toBe('published');
      for (const role of PRIVILEGED) expect(effectiveDashboardCourseStatus(status, role)).toBe(status);
    }
  });

  it('the two predicates are distinct (positive control for the query assertions below)', () => {
    expect(DRAFT_WHERE).not.toEqual(lmsPublishedCourseWhere);
    expect(lmsPublishedCourseWhere).toEqual({ status: { equals: 'published', mode: 'insensitive' } });
  });
});

describe('the dashboard catalogue query (mocked Prisma)', () => {
  it('a learner never triggers a draft query, whatever status was asked for', async () => {
    for (const status of STATUSES) {
      for (const role of LEARNERS) {
        findMany.mockClear();
        await getDashboardCourseListItemsFromDatabase({ status, role });
        const wheres = whereArgs();
        expect(wheres, `${status} as ${String(role)}`).toEqual([lmsPublishedCourseWhere]);
        expect(wheres, `${status} as ${String(role)}`).not.toContainEqual(DRAFT_WHERE);
      }
    }
  });

  it('an admin or instructor asking for drafts gets exactly the draft query', async () => {
    for (const role of PRIVILEGED) {
      findMany.mockClear();
      await getDashboardCourseListItemsFromDatabase({ status: 'draft', role });
      expect(whereArgs(), role).toEqual([DRAFT_WHERE]);
    }
  });

  it('an admin or instructor asking for all gets both queries; asking for published gets one', async () => {
    for (const role of PRIVILEGED) {
      findMany.mockClear();
      await getDashboardCourseListItemsFromDatabase({ status: 'all', role });
      expect(whereArgs(), role).toEqual(expect.arrayContaining([lmsPublishedCourseWhere, DRAFT_WHERE]));
      expect(findMany, role).toHaveBeenCalledTimes(2);

      findMany.mockClear();
      await getDashboardCourseListItemsFromDatabase({ status: 'published', role });
      expect(whereArgs(), role).toEqual([lmsPublishedCourseWhere]);
    }
  });

  it('runs no query at all without a database or during the build', async () => {
    process.env.DATABASE_URL = '';
    expect(await getDashboardCourseListItemsFromDatabase({ status: 'all', role: 'admin' })).toEqual([]);
    process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test';
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(await getDashboardCourseListItemsFromDatabase({ status: 'all', role: 'admin' })).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
