import type { NextRequest, NextResponse } from 'next/server';

import {
  buildFirstTouch,
  FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS,
  FIRST_TOUCH_COOKIE_NAME,
  parseFirstTouchCookie,
} from '@/lib/analytics/first-touch';

/** Router prefetches and RSC payload fetches are not a visitor landing on a page. */
function isPageNavigation(request: NextRequest): boolean {
  if (request.method !== 'GET') return false;
  const h = request.headers;
  if (h.has('rsc') || h.has('next-router-prefetch') || h.has('next-router-state-tree')) return false;
  const purpose = `${h.get('purpose') ?? ''} ${h.get('sec-purpose') ?? ''}`.toLowerCase();
  return !purpose.includes('prefetch');
}

/**
 * Adds the `carsi_ft` first-touch cookie to `response` when this is a visitor's first page view
 * (no valid cookie yet) and the view did not come from our own site. Never overwrites a valid
 * existing first touch. The caller decides whether the feature is enabled.
 *
 * Runs in the request proxy, so it works on prerendered pages and reads the Referer header the
 * browser sent for the landing navigation (host only is kept).
 */
export function withFirstTouchCookie(request: NextRequest, response: NextResponse, now = new Date()): NextResponse {
  if (!isPageNavigation(request)) return response;
  if (parseFirstTouchCookie(request.cookies.get(FIRST_TOUCH_COOKIE_NAME)?.value)) return response;

  const ft = buildFirstTouch({
    referrer: request.headers.get('referer') ?? '',
    landingUrl: request.nextUrl.href,
    now,
    siteHost: request.nextUrl.hostname,
  });
  if (!ft) return response;

  // Next.js percent-encodes the value once on the way out and decodes it once on the way in.
  response.cookies.set(FIRST_TOUCH_COOKIE_NAME, JSON.stringify(ft), {
    maxAge: FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  });
  // This response is personal to one visitor: no shared cache may store it with the cookie.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
