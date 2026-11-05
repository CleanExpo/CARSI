import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const state = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  pack: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => state.claims,
}));

vi.mock('@/lib/server/carsi-coaching-marketing-pack', () => ({
  getLatestMarketingPackForUser: async () => state.pack,
}));

const { GET } = await import('../../../app/api/coaching/portal/marketing-pack/download/route');

const samplePack = {
  review: {
    summary: 's',
    fixes: [],
    checks: [],
    websiteUrl: null,
    googleBusinessUrl: null,
    siteReadable: true,
  },
  checklist: [{ id: '1', label: 'L', detail: 'd', done: false }],
  calendar: {
    posts: [{ day: 1, date: '2026-11-06', theme: 'T', caption: 'Hi', hashtags: ['#a'] }],
    source: 'template',
    rejectedCount: 0,
    tradeMatched: true,
  },
  voice: { businessName: 'A', trade: 'T', town: 'X', services: '' },
  generatedAt: '2026-11-05T00:00:00.000Z',
};

describe('marketing-pack download route', () => {
  beforeEach(() => {
    state.claims = { sub: MEMBER };
    state.pack = { ...samplePack, id: 'p1', calendarSource: 'template' };
  });

  it('rejects unknown item ids', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack/download?item=nope')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 without a pack', async () => {
    state.pack = null;
    const res = await GET(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack/download?item=review')
    );
    expect(res.status).toBe(404);
  });

  it('returns attachment headers for checklist', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/coaching/portal/marketing-pack/download?item=checklist')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
