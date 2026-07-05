import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-463 gap: `decideMembershipEntitlement` / `decideTeamSeatSubscription` /
 * `isSeatEntitled` (the pure decision cores) are well covered in
 * entitlements.test.ts and team-entitlements.test.ts, but the async DATA
 * WRAPPERS that the app actually calls on every gated request —
 * `getEntitlements`, `getTeamEntitlements`, `getOrgEntitlements` — had NO
 * coverage at all. These wrappers are revenue-critical: they are what decides,
 * live, whether a signed-in user may enrol in a paid course. This file proves
 * their fail-closed contract (documented in entitlements.ts) actually holds:
 * a missing DATABASE_URL, an empty userId, or a throwing Prisma call must all
 * deny access rather than silently granting it.
 */

const findUniqueSubscription = vi.fn();
const findManyTeamMember = vi.fn();
const findManyTeamSubscription = vi.fn();
const findManyTeam = vi.fn();
const findManyOrgSubscription = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsSubscription: { findUnique: (...a: unknown[]) => findUniqueSubscription(...a) },
    lmsTeamMember: {
      findMany: (...a: unknown[]) => findManyTeamMember(...a),
    },
    lmsTeamSubscription: {
      findMany: (...a: unknown[]) => findManyTeamSubscription(...a),
    },
    lmsTeam: { findMany: (...a: unknown[]) => findManyTeam(...a) },
    lmsOrgSubscription: {
      findMany: (...a: unknown[]) => findManyOrgSubscription(...a),
    },
  },
}));

import { getEntitlements, getOrgEntitlements, getTeamEntitlements } from './entitlements';

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

afterAll(() => {
  process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
});

describe('getEntitlements (individual membership data wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('fails closed when DATABASE_URL is not configured, without touching Prisma', async () => {
    process.env.DATABASE_URL = '';
    const result = await getEntitlements('user-1');
    expect(result.hasActiveMembership).toBe(false);
    expect(result.reason).toBe('none');
    expect(findUniqueSubscription).not.toHaveBeenCalled();
  });

  it('fails closed on an empty userId', async () => {
    const result = await getEntitlements('');
    expect(result.hasActiveMembership).toBe(false);
    expect(findUniqueSubscription).not.toHaveBeenCalled();
  });

  it('grants full catalogue access for an active subscription row', async () => {
    findUniqueSubscription.mockResolvedValueOnce({
      status: 'active',
      currentPeriodEnd: new Date('2099-01-01'),
      cancelAtPeriodEnd: false,
    });
    const result = await getEntitlements('user-1');
    expect(result).toEqual({
      hasActiveMembership: true,
      reason: 'active',
      entitledCourseIds: 'ALL',
      status: 'active',
      currentPeriodEnd: new Date('2099-01-01'),
      cancelAtPeriodEnd: false,
    });
  });

  it('reports not-entitled with an honest reason when no subscription row exists', async () => {
    findUniqueSubscription.mockResolvedValueOnce(null);
    const result = await getEntitlements('user-1');
    expect(result.hasActiveMembership).toBe(false);
    expect(result.reason).toBe('none');
    expect(result.entitledCourseIds).toBeNull();
  });

  it('FAILS CLOSED (denies) when the Prisma lookup throws — never grant on uncertainty', async () => {
    findUniqueSubscription.mockRejectedValueOnce(new Error('connection reset'));
    const result = await getEntitlements('user-1');
    expect(result.hasActiveMembership).toBe(false);
    expect(result.reason).toBe('none');
    expect(result.entitledCourseIds).toBeNull();
  });
});

describe('getTeamEntitlements (Teams seat data wrapper, GP-442)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('returns no seat when the user belongs to no team, without further queries', async () => {
    findManyTeamMember.mockResolvedValueOnce([]);
    const result = await getTeamEntitlements('user-1');
    expect(result.hasActiveSeat).toBe(false);
    expect(result.reason).toBe('none');
    expect(findManyTeamSubscription).not.toHaveBeenCalled();
  });

  it('grants a seat for a member within seatLimit on an active team subscription', async () => {
    findManyTeamMember
      .mockResolvedValueOnce([{ teamId: 'team-1' }]) // membership scan
      .mockResolvedValueOnce([{ teamId: 'team-1', userId: 'user-1' }]); // ordered members
    findManyTeamSubscription.mockResolvedValueOnce([
      { teamId: 'team-1', status: 'active', currentPeriodEnd: new Date('2099-01-01'), seatLimit: 5 },
    ]);
    findManyTeam.mockResolvedValueOnce([{ id: 'team-1', ownerId: 'owner-1' }]);

    const result = await getTeamEntitlements('user-1');
    expect(result.hasActiveSeat).toBe(true);
    expect(result.entitledCourseIds).toBe('ALL');
    expect(result.teamId).toBe('team-1');
    expect(result.isOwner).toBe(false);
  });

  it('denies a member past the paid seat limit (seat_full) even though the sub is active', async () => {
    const members = Array.from({ length: 6 }, (_, i) => ({ teamId: 'team-1', userId: `u${i}` }));
    findManyTeamMember
      .mockResolvedValueOnce([{ teamId: 'team-1' }])
      .mockResolvedValueOnce(members);
    findManyTeamSubscription.mockResolvedValueOnce([
      { teamId: 'team-1', status: 'active', currentPeriodEnd: new Date('2099-01-01'), seatLimit: 5 },
    ]);
    findManyTeam.mockResolvedValueOnce([{ id: 'team-1', ownerId: 'u0' }]);

    // u5 is the 6th member (seat index 5) on a 5-seat plan.
    const result = await getTeamEntitlements('u5');
    expect(result.hasActiveSeat).toBe(false);
    expect(result.reason).toBe('seat_full');
  });

  it('FAILS CLOSED when Prisma throws mid-lookup', async () => {
    findManyTeamMember.mockRejectedValueOnce(new Error('db down'));
    const result = await getTeamEntitlements('user-1');
    expect(result.hasActiveSeat).toBe(false);
    expect(result.reason).toBe('none');
  });
});

describe('getOrgEntitlements (org monthly data wrapper, GP-443)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('grants the entitled category for an active org subscription', async () => {
    findManyTeamMember.mockResolvedValueOnce([{ teamId: 'team-9' }]);
    findManyOrgSubscription.mockResolvedValueOnce([
      {
        teamId: 'team-9',
        status: 'active',
        currentPeriodEnd: new Date('2099-01-01'),
        entitledCategory: 'CARSI Maintenance Company Onboarding',
      },
    ]);
    const result = await getOrgEntitlements('user-1');
    expect(result.hasActiveOrg).toBe(true);
    expect(result.entitledCategory).toBe('CARSI Maintenance Company Onboarding');
  });

  it('denies with honest status when the org subscription has lapsed', async () => {
    findManyTeamMember.mockResolvedValueOnce([{ teamId: 'team-9' }]);
    findManyOrgSubscription.mockResolvedValueOnce([
      { teamId: 'team-9', status: 'canceled', currentPeriodEnd: null, entitledCategory: 'X' },
    ]);
    const result = await getOrgEntitlements('user-1');
    expect(result.hasActiveOrg).toBe(false);
    expect(result.entitledCategory).toBeNull();
    expect(result.status).toBe('canceled');
  });

  it('returns the NO_ORG sentinel when the user is on no team', async () => {
    findManyTeamMember.mockResolvedValueOnce([]);
    const result = await getOrgEntitlements('user-1');
    expect(result.hasActiveOrg).toBe(false);
    expect(result.teamId).toBeNull();
    expect(findManyOrgSubscription).not.toHaveBeenCalled();
  });

  it('FAILS CLOSED when Prisma throws', async () => {
    findManyTeamMember.mockRejectedValueOnce(new Error('timeout'));
    const result = await getOrgEntitlements('user-1');
    expect(result.hasActiveOrg).toBe(false);
    expect(result.reason).toBe('none');
  });
});
