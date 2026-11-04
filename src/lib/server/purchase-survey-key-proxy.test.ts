/**
 * The request proxy sets the purchase-survey browser key (`carsi_svk`) on a page view before any
 * checkout starts (GP-662), so a browser's first checkouts, even two at once, bind one key.
 * Dark unless PURCHASE_SURVEY_ENABLED.
 */
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
  renamed: vi.fn(),
}));

vi.mock('@/lib/api/middleware', () => ({ updateSession: mocks.updateSession }));
vi.mock('@/lib/seo/renamed-course-slugs', () => ({
  renamedCourseRedirect: mocks.renamed,
  lookupCourseSlugInDatabase: vi.fn(),
}));

const { proxy } = await import('../../../proxy');
const { newPurchaseSurveyCookieValue, purchaseSurveyKeyFromCookie } = await import(
  '@/lib/server/purchase-survey-token'
);

const FLAG = 'PURCHASE_SURVEY_ENABLED';

function pageRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://carsi.com.au${path}`, { method: 'GET', headers });
}

function keyCookie(res: Response): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith('carsi_svk='));
}

beforeEach(() => {
  process.env[FLAG] = 'true';
  delete process.env.ATTRIBUTION_CAPTURE_ENABLED;
  mocks.renamed.mockReset();
  mocks.renamed.mockResolvedValue(null);
  mocks.updateSession.mockReset();
  mocks.updateSession.mockImplementation(async () => NextResponse.next());
});

afterEach(() => {
  delete process.env[FLAG];
});

describe('purchase survey browser key in the proxy', () => {
  it('first page view: sets one HttpOnly, Secure, Lax key cookie on path / and marks the reply private', async () => {
    const res = await proxy(pageRequest('/courses/moisture'));
    const header = keyCookie(res);
    expect(header).toBeDefined();
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header?.toLowerCase()).toContain('samesite=lax');
    expect(header).toContain('Path=/;');
    expect(header).toContain('Max-Age=2592000');
    const value = decodeURIComponent(header!.split(';')[0].split('=')[1]);
    expect(purchaseSurveyKeyFromCookie(value)).not.toBeNull();
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('a valid key already present is never replaced, so later checkouts keep binding the same key', async () => {
    const existing = newPurchaseSurveyCookieValue();
    const res = await proxy(pageRequest('/courses/moisture', { cookie: `carsi_svk=${existing}` }));
    expect(keyCookie(res)).toBeUndefined();
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('a forged or junk key is replaced with a valid one', async () => {
    const forged = `${'a'.repeat(32)}.${'b'.repeat(64)}`;
    const res = await proxy(pageRequest('/', { cookie: `carsi_svk=${forged}` }));
    const value = decodeURIComponent(keyCookie(res)!.split(';')[0].split('=')[1]);
    expect(value).not.toBe(forged);
    expect(purchaseSurveyKeyFromCookie(value)).not.toBeNull();
  });

  it.each([
    ['router prefetch', { 'next-router-prefetch': '1' }],
    ['RSC payload', { rsc: '1' }],
    ['browser prefetch', { 'sec-purpose': 'prefetch' }],
  ])('%s: no key cookie', async (_label, headers) => {
    const res = await proxy(pageRequest('/courses/moisture', headers));
    expect(keyCookie(res)).toBeUndefined();
  });

  it('flag off: no key cookie and no cache header change', async () => {
    delete process.env[FLAG];
    const res = await proxy(pageRequest('/courses/moisture'));
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
