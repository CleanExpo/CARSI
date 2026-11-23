import type { NextRequest, NextResponse } from 'next/server';

import {
  PARTNER_REF_COOKIE_MAX_AGE_SECONDS,
  PARTNER_REF_COOKIE_NAME,
  PARTNER_REF_QUERY_PARAM,
  parseReferralPartnerId,
} from '@/lib/partners/referral-partners';
import { isPageNavigation } from '@/lib/server/first-touch-capture';

/**
 * GP-767: when a page is opened from a partner link (`?ref=ccw`), records the partner in the
 * `carsi_ref` cookie for 30 days. HttpOnly and set by the server, so browsers that cap
 * script-written cookies (Safari, 7 days) keep the stated lifetime. The cookie holds only the
 * partner id, nothing about the visitor. An unknown ref is ignored: it never sets or clears it.
 */
export function withPartnerRefCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!isPageNavigation(request)) return response;
  const partnerId = parseReferralPartnerId(request.nextUrl.searchParams.get(PARTNER_REF_QUERY_PARAM));
  if (!partnerId) return response;

  response.cookies.set(PARTNER_REF_COOKIE_NAME, partnerId, {
    maxAge: PARTNER_REF_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
  });
  // Personal to one visitor: no shared cache may store this response with the cookie.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
