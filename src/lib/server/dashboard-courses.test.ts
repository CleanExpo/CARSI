import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany, session } = vi.hoisted(() => ({
  findMany: vi.fn(async (): Promise<unknown[]> => []),
  session: {
    claims: null as null | { sub: string; email: string; full_name: string; role: string },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsCourse: { findMany } },
}));

vi.mock('@/lib/server/session-server', () => ({
  getServerSessionClaims: vi.fn(async () => session.claims),
}));

import { getDashboardCoursesForSession } from './dashboard-courses';
import { lmsPublishedCourseWhere, type DashboardCourseStatusFilter } from './public-courses-list';

/**
 * WS1 fix 3 (GP-542). The page reaches the dashboard catalogue only through this wrapper, which
 * reads the role from the session cookie itself. These tests set the session and read back the
 * `where` the real list function handed to Prisma.
 */

const DRAFT_WHERE = { status: { equals: 'draft', mode: 'insensitive' } };
const STATUSES: readonly DashboardCourseStatusFilter[] = ['all', 'draft', 'published'];

function claimsWith(role: string) {
  return { sub: 'user-1', email: 'learner@example.com', full_name: 'A Learner', role };
}

function whereArgs(): unknown[] {
  return findMany.mock.calls.map((call) => (call[0] as { where: unknown }).where);
}

beforeEach(() => {
  findMany.mockClear();
  session.claims = null;
  process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test';
  delete process.env.NEXT_PHASE;
});

describe('the dashboard catalogue for the current session', () => {
  it('a learner asking for drafts is served the published list, and told drafts are not offered', async () => {
    for (const role of ['student', 'learner', 'owner', 'user', '']) {
      for (const requested of STATUSES) {
        findMany.mockClear();
        session.claims = claimsWith(role);
        const result = await getDashboardCoursesForSession(requested);
        expect(result.canSeeDrafts, `${role}/${requested}`).toBe(false);
        expect(result.status, `${role}/${requested}`).toBe('published');
        expect(whereArgs(), `${role}/${requested}`).toEqual([lmsPublishedCourseWhere]);
        expect(result.claims?.role).toBe(role);
      }
    }
  });

  it('no session at all is a learner (fail closed)', async () => {
    session.claims = null;
    const result = await getDashboardCoursesForSession('draft');
    expect(result.claims).toBeNull();
    expect(result.canSeeDrafts).toBe(false);
    expect(result.status).toBe('published');
    expect(whereArgs()).toEqual([lmsPublishedCourseWhere]);
    expect(whereArgs()).not.toContainEqual(DRAFT_WHERE);
  });

  it('an admin or instructor keeps the request: drafts query drafts, all queries both', async () => {
    for (const role of ['admin', 'instructor']) {
      session.claims = claimsWith(role);

      findMany.mockClear();
      const drafts = await getDashboardCoursesForSession('draft');
      expect(drafts.canSeeDrafts).toBe(true);
      expect(drafts.status).toBe('draft');
      expect(whereArgs()).toEqual([DRAFT_WHERE]);

      findMany.mockClear();
      const all = await getDashboardCoursesForSession('all');
      expect(all.status).toBe('all');
      expect(whereArgs()).toEqual(expect.arrayContaining([lmsPublishedCourseWhere, DRAFT_WHERE]));
      expect(findMany).toHaveBeenCalledTimes(2);
    }
  });

  it('the session, not the caller, decides (positive control: the same request differs only by session)', async () => {
    session.claims = claimsWith('student');
    await getDashboardCoursesForSession('draft');
    const learnerWheres = whereArgs();
    findMany.mockClear();
    session.claims = claimsWith('admin');
    await getDashboardCoursesForSession('draft');
    expect(learnerWheres).toEqual([lmsPublishedCourseWhere]);
    expect(whereArgs()).toEqual([DRAFT_WHERE]);
  });
});
