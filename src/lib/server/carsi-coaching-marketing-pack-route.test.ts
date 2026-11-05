/**
 * GP-634 — marketing pack portal routes with auth and generation mocked.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const state = vi.hoisted(() => ({
  claims: null as { sub: string; email: string; full_name: string; role: string } | null,
  entitled: true,
  latest: null as { generatedAt: string } | null,
  inputs: {
    websiteUrl: null as string | null,
    googleBusinessUrl: null as string | null,
    voice: { businessName: 'Acme', trade: 'Restoration', town: 'Perth', services: 'Dry' },
  },
  generateThrows: false,
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => state.claims,
}));

vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  getCoachingPortalRowForUser: async () =>
    state.entitled
      ? { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) }
      : null,
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => null,
}));

vi.mock('@/lib/server/carsi-coaching-marketing-pack', () => ({
  MARKETING_PACK_COOLDOWN_MS: 600_000,
  getLatestMarketingPackForUser: async () => state.latest,
  listMarketingPackSummariesForUser: async () => [],
  loadMarketingInputsForUser: async () => state.inputs,
  generateMarketingPack: async () => {
    if (state.generateThrows) throw new Error('boom');
  },
  defaultMarketingPackDeps: {},
}));

const { GET, POST } = await import('../../../app/api/coaching/portal/marketing-pack/route');

describe('marketing-pack route', () => {
  beforeEach(() => {
    state.claims = {
      sub: MEMBER,
      email: 'm@example.com',
      full_name: 'Member',
      role: 'student',
    };
    state.entitled = true;
    state.latest = null;
    state.generateThrows = false;
    state.inputs.voice = {
      businessName: 'Acme',
      trade: 'Restoration',
      town: 'Perth',
      services: 'Dry',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns 401 when logged out', async () => {
    state.claims = null;
    const res = await GET(new NextRequest('http://localhost/api/coaching/portal/marketing-pack'));
    expect(res.status).toBe(401);
  });

  it('POST returns 400 when profile is empty', async () => {
    state.inputs.voice = { businessName: '', trade: '', town: '', services: '' };
    const res = await POST(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack', { method: 'POST' })
    );
    expect(res.status).toBe(400);
  });

  it('POST returns 429 inside cooldown', async () => {
    state.latest = { generatedAt: new Date().toISOString() };
    const res = await POST(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack', { method: 'POST' })
    );
    expect(res.status).toBe(429);
  });

  it('POST builds when entitled and profile ok', async () => {
    state.latest = { generatedAt: new Date(Date.now() - 700_000).toISOString() };
    const res = await POST(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack', { method: 'POST' })
    );
    expect(res.status).toBe(200);
  });
});
