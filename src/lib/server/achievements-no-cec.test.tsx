// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  queryRaw: vi.fn(),
  enrolments: vi.fn(),
  claims: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.apiGet } }));
vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: mocks.queryRaw, lmsEnrollment: { findMany: mocks.enrolments } },
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
// A course the registry approves, so the old code had real CEC hours to turn into a milestone.
vi.mock('@/lib/server/course-cec-hours', () => ({ resolveLmsCourseCecHours: () => 8 }));

import LeaderboardPage from '../../../app/(dashboard)/dashboard/student/leaderboard/page';
import { GET as levelRoute } from '../../../app/api/lms/gamification/me/level/route';
import { getLearnerLevelPayload } from './learner-xp';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Gamification must never award, display or imply CEC hours. The Achievements page listed
 * "Approved IICRC CEC hours" as a milestone to unlock, showed an "Approved IICRC CEC" tile beside
 * XP and level, and the XP level payload carried `total_cec_lifetime`. CEC hours belong on the
 * credentials and renewal surfaces, which read the approvals registry, not on a points page.
 */
const CEC = /\bCECs?\b|continuing education/i;

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            period_label: 'October 2026',
            period_timezone: 'Australia/Sydney',
            items: [],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
    )
  );
  mocks.apiGet.mockImplementation(async (path: string) => {
    if (path.includes('/gamification/me/level')) {
      return { total_xp: 250, current_level: 1, level_title: 'Apprentice', total_cec_lifetime: 8 };
    }
    return [
      {
        status: 'completed',
        all_lessons_complete: true,
        certificate_issued_at: '2026-10-01',
        cec_hours: 8,
      },
    ];
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('Achievements carry no CEC framing', () => {
  it('a learner with approved CEC hours sees milestones and XP, but no CEC milestone, tile or copy', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(createElement(LeaderboardPage));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const text = container.textContent ?? '';
    expect(text).toContain('First course completed'); // the page really rendered its milestones
    expect(text).toContain('250');
    expect(text).not.toMatch(CEC);
    expect(text).not.toMatch(/IICRC/);
  });

  it('the XP level payload has no CEC field and reads no enrolment CEC data', async () => {
    mocks.queryRaw.mockResolvedValue([]);
    mocks.enrolments.mockResolvedValue([
      { course: { slug: 'water-damage-restoration-fundamentals' } },
    ]);
    const payload = await getLearnerLevelPayload('10000000-0000-4000-8000-000000000001');
    expect(Object.keys(payload).filter((k) => /cec/i.test(k))).toEqual([]);
    expect(mocks.enrolments).not.toHaveBeenCalled();
  });

  it('the level route fallback (no database) has no CEC field', async () => {
    vi.stubEnv('DATABASE_URL', '');
    mocks.claims.mockResolvedValue({ sub: 'learner' });
    const res = await levelRoute(new NextRequest('http://localhost/api/lms/gamification/me/level'));
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.total_xp).toBe(0);
    expect(Object.keys(body).filter((k) => /cec/i.test(k))).toEqual([]);
  });
});
