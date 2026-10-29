/**
 * First-touch capture in the request proxy (Authority Machine slice 1a, T1a-7 and the dark pin).
 *
 * Capture lives in the proxy, not in a layout prop, because most public pages are prerendered:
 * a flag read while rendering a static page is frozen at build time, and the Docker build does
 * not receive this variable, so a layout-read flag could never switch on for those pages. The
 * proxy runs on every page request at run time.
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
const { FIRST_TOUCH_COOKIE_NAME, parseFirstTouchCookie } = await import('@/lib/analytics/first-touch');

const KEY = 'ATTRIBUTION_CAPTURE_ENABLED';

function pageRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://carsi.com.au${path}`, { method: 'GET', headers });
}

function setCookieHeaders(res: Response): string[] {
  return res.headers.getSetCookie();
}

function firstTouchSetCookie(res: Response): string | undefined {
  return setCookieHeaders(res).find((c) => c.startsWith(`${FIRST_TOUCH_COOKIE_NAME}=`));
}

beforeEach(() => {
  mocks.renamed.mockReset();
  mocks.renamed.mockResolvedValue(null);
  mocks.updateSession.mockReset();
  mocks.updateSession.mockImplementation(async () => {
    const res = NextResponse.next();
    res.headers.set('x-baseline', '1');
    return res;
  });
});

afterEach(() => {
  delete process.env[KEY];
});

describe('flag off (ships dark)', () => {
  it('returns the session response untouched: no carsi_ft cookie, same headers', async () => {
    delete process.env[KEY];
    const req = pageRequest('/courses/moisture?utm_source=x', { referer: 'https://www.google.com/' });
    const baseline = await mocks.updateSession(req);
    const res = await proxy(req);
    expect(firstTouchSetCookie(res)).toBeUndefined();
    expect([...res.headers.entries()]).toEqual([...baseline.headers.entries()]);
  });
});

describe('flag on', () => {
  beforeEach(() => {
    process.env[KEY] = 'true';
  });

  it('records the first touch from the Referer header and the landing path', async () => {
    const res = await proxy(
      pageRequest('/courses/moisture?email=a%40b.c', {
        referer: 'https://www.google.com/search?q=secret+name',
      })
    );
    const header = firstTouchSetCookie(res);
    expect(header).toBeDefined();
    expect(header).toContain('Max-Age=7776000');
    expect(header).toContain('Path=/');
    expect(header?.toLowerCase()).toContain('samesite=lax');
    expect(header).toContain('Secure');
    const value = header!.slice(FIRST_TOUCH_COOKIE_NAME.length + 1).split(';')[0];
    const ft = parseFirstTouchCookie(value);
    expect(ft?.ch).toBe('organic_search');
    expect(ft?.ref).toBe('google');
    expect(ft?.lp).toBe('courses');
    expect(header).not.toMatch(/secret|%40|email|moisture|www/);
    expect(res.headers.get('x-baseline')).toBe('1');
  });

  it('an identifying referrer subdomain is stored only as the category other', async () => {
    const res = await proxy(
      pageRequest('/for/twelve-queen-street', { referer: 'https://jane-smith.notion.site/notes' })
    );
    const header = firstTouchSetCookie(res)!;
    const value = decodeURIComponent(header.slice(FIRST_TOUCH_COOKIE_NAME.length + 1).split(';')[0]);
    expect(JSON.parse(value)).toMatchObject({ ch: 'referral', ref: 'other', lp: 'for' });
    expect(header).not.toMatch(/jane|smith|notion|twelve|queen/);
  });

  it('T1a-7: never overwrites an existing first touch on a later page view', async () => {
    const existing = encodeURIComponent(
      JSON.stringify({ ch: 'social', ref: 'linkedin', lp: 'home', at: '2026-10-01' })
    );
    const res = await proxy(
      pageRequest('/courses', {
        referer: 'https://www.google.com/',
        cookie: `${FIRST_TOUCH_COOKIE_NAME}=${existing}`,
      })
    );
    expect(firstTouchSetCookie(res)).toBeUndefined();
  });

  it('does not record a navigation that came from our own site', async () => {
    const res = await proxy(pageRequest('/courses', { referer: 'https://carsi.com.au/' }));
    expect(firstTouchSetCookie(res)).toBeUndefined();
  });

  it('does not record router prefetch or RSC requests', async () => {
    for (const headers of [{ rsc: '1' }, { 'next-router-prefetch': '1' }, { purpose: 'prefetch' }]) {
      const res = await proxy(pageRequest('/courses', headers));
      expect(firstTouchSetCookie(res)).toBeUndefined();
    }
  });

  it('records a direct visit', async () => {
    const res = await proxy(pageRequest('/'));
    const header = firstTouchSetCookie(res);
    const value = header!.slice(FIRST_TOUCH_COOKIE_NAME.length + 1).split(';')[0];
    expect(parseFirstTouchCookie(value)?.ch).toBe('direct');
  });

  it('a corrupt existing cookie is replaced, not trusted', async () => {
    const res = await proxy(
      pageRequest('/', { cookie: `${FIRST_TOUCH_COOKIE_NAME}=<script>` })
    );
    expect(firstTouchSetCookie(res)).toBeDefined();
  });

  it('keeps the renamed-course redirect and still records the first touch on it', async () => {
    mocks.renamed.mockResolvedValue(NextResponse.redirect('https://carsi.com.au/courses/new', 308));
    const res = await proxy(pageRequest('/courses/old', { referer: 'https://chatgpt.com/' }));
    expect(res.status).toBe(308);
    expect(mocks.updateSession).not.toHaveBeenCalled();
    expect(firstTouchSetCookie(res)).toBeDefined();
  });
});
