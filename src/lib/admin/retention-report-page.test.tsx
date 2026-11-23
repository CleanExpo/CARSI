import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isCountedPath } from '@/lib/analytics/consent';
import { signSessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

/**
 * Learning OS register row 4: the retention report is for admins only.
 *
 * The page's own check runs the REAL getAdminSessionOrNull and real token verification. Only the
 * database re-check ("is this user an admin now?") and the metrics query are stubbed, so the test
 * can tell a refused visitor from an admin. The admin case is the positive control: without it,
 * "renders nothing" would pass even if the page never rendered for anyone.
 */

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}));

const mocks = vi.hoisted(() => ({ adminNow: vi.fn(), metrics: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/current-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/current-admin')>()),
  isLmsAdminNow: mocks.adminNow,
}));
vi.mock('@/lib/admin/retention-metrics', () => ({ getRetentionMetrics: mocks.metrics }));

const { default: AdminRetentionPage } = await import('../../../app/(admin)/admin/retention/page');

const USER_ID = '20000000-0000-4000-8000-000000000801';

function claims(role: string): SessionClaims {
  return { sub: USER_ID, email: 'person@example.test', full_name: 'Person', role };
}

const FIGURES = {
  enrolled: 120,
  activated: 90,
  returnWithin7Days: { days: 7, eligible: 80, returned: 41 },
  returnWithin30Days: { days: 30, eligible: 60, returned: 37 },
  completed: 22,
};

beforeEach(() => {
  jar.clear();
  mocks.metrics.mockResolvedValue(FIGURES);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('admin retention report: access', () => {
  it('refuses a visitor with no session and never queries learner records', async () => {
    expect(await AdminRetentionPage()).toBeNull();
    expect(mocks.metrics).not.toHaveBeenCalled();
  });

  it('refuses a signed-in learner (non-admin token) and never queries learner records', async () => {
    jar.set('auth_token', await signSessionToken(claims('student')));
    mocks.adminNow.mockResolvedValue(true); // even a wrong "yes" from the DB cannot lift a student token
    expect(await AdminRetentionPage()).toBeNull();
    expect(mocks.metrics).not.toHaveBeenCalled();
  });

  it('refuses an admin token the database no longer treats as admin', async () => {
    jar.set('auth_token', await signSessionToken(claims('admin')));
    mocks.adminNow.mockResolvedValue(false);
    expect(await AdminRetentionPage()).toBeNull();
    expect(mocks.metrics).not.toHaveBeenCalled();
  });

  it('shows the counts to a current admin (positive control)', async () => {
    jar.set('auth_token', await signSessionToken(claims('admin')));
    mocks.adminNow.mockResolvedValue(true);
    const page = await AdminRetentionPage();
    expect(page).not.toBeNull();
    const html = renderToStaticMarkup(page!);
    expect(mocks.metrics).toHaveBeenCalledTimes(1);
    expect(html).toContain('Learner retention');
    expect(html).toMatch(/data-metric="Activated">90</);
    expect(html).toMatch(/data-metric="Returned within 7 days">41</);
    expect(html).toContain('51% of 80');
    expect(html).not.toMatch(/could not be loaded/i);
  });
});

describe('admin retention report: failure and privacy', () => {
  it('a failed query reads as a failure, never as zero', async () => {
    jar.set('auth_token', await signSessionToken(claims('admin')));
    mocks.adminNow.mockResolvedValue(true);
    mocks.metrics.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToStaticMarkup((await AdminRetentionPage())!);
    expect(html).toMatch(/could not be loaded/i);
    expect(html).toContain('not the same as zero');
    expect(html).not.toMatch(/data-metric=/);
  });

  it('the report page is never a counted analytics path', () => {
    expect(isCountedPath('/admin/retention')).toBe(false);
  });
});
