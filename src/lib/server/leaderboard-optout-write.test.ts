import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ update: vi.fn(), findUnique: vi.fn(), claims: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { lmsUser: { update: mocks.update, findUnique: mocks.findUnique } },
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));

import { PATCH } from '../../../app/api/lms/auth/me/route';

/**
 * GP-775 review r2 of 37499ff2: PATCH /api/lms/auth/me swallowed a failed write and answered
 * 200 with the unchanged stored values, so the profile page said "preferences saved" while a
 * learner who had just opted out stayed on the board. A consent change must never be
 * acknowledged unless it was stored.
 */
const LEARNER = {
  sub: '10000000-0000-4000-8000-0000000000d1',
  email: 'l@example.test',
  full_name: 'L',
  role: 'student',
};

let stored = {
  leaderboardShowDisplayName: true,
  leaderboardDisplayName: 'Alex K., QLD' as string | null,
};

function patch(body: Record<string, unknown>) {
  return PATCH(
    new NextRequest('http://localhost/api/lms/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  );
}

beforeEach(() => {
  stored = { leaderboardShowDisplayName: true, leaderboardDisplayName: 'Alex K., QLD' };
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue(LEARNER);
  mocks.findUnique.mockImplementation(async () => ({ ...stored, isVerified: false }));
  mocks.update.mockImplementation(async ({ data }: { data: Partial<typeof stored> }) => {
    stored = { ...stored, ...data };
    return stored;
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('opting out of the leaderboard is acknowledged only when stored (GP-775 r2)', () => {
  it('a failed write is an error, never a 200 success', async () => {
    mocks.update.mockRejectedValue(new Error('database unavailable'));
    const res = await patch({
      leaderboard_show_display_name: false,
      leaderboard_display_name: null,
    });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(stored.leaderboardShowDisplayName).toBe(true); // unchanged, and not acknowledged
  });

  // Review r3 found the same kind on a second path: with no database configured the write was
  // skipped and the route still answered 200. The rule is now one check for the whole class:
  // a requested change that was not persisted is never a success, whatever the reason.
  it.each([
    ['opt-out', { leaderboard_show_display_name: false, leaderboard_display_name: null }],
    ['opt-in', { leaderboard_show_display_name: true }],
    ['label change', { leaderboard_display_name: 'New label' }],
    ['theme change', { theme_preference: 'light' }],
  ])('with no database configured, a %s is not acknowledged', async (_label, body) => {
    vi.stubEnv('DATABASE_URL', '');
    const res = await patch(body);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('a stored opt-out returns the stored false value', async () => {
    const res = await patch({
      leaderboard_show_display_name: false,
      leaderboard_display_name: null,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { leaderboard_show_display_name: boolean };
    expect(body.leaderboard_show_display_name).toBe(false);
    expect(stored.leaderboardShowDisplayName).toBe(false);
  });
});
