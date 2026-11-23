/**
 * GP-767: a partner link (`?ref=ccw`) records the partner in a first-party cookie for 30 days.
 * Literal names and values on purpose: the test pins the public contract, not the constants.
 */
import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import { withPartnerRefCookie } from '@/lib/server/partner-referral-cookie';

function visit(url: string, headers: Record<string, string> = {}): NextResponse {
  const request = new NextRequest(url, { method: 'GET', headers });
  return withPartnerRefCookie(request, NextResponse.next());
}

describe('partner referral cookie (GP-767)', () => {
  it('a ?ref=ccw link sets carsi_ref=ccw for 30 days, HttpOnly, first party', () => {
    const response = visit('https://carsi.com.au/courses/ccw-carsi-truckmount-operations?ref=ccw');
    const cookie = response.cookies.get('carsi_ref');
    expect(cookie?.value).toBe('ccw');
    expect(cookie?.maxAge).toBe(2_592_000);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe('/');
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.secure).toBe(true);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('accepts the partner id in any letter case', () => {
    const response = visit('https://carsi.com.au/courses/x?ref=CCW');
    expect(response.cookies.get('carsi_ref')?.value).toBe('ccw');
  });

  it('ignores an unknown ref: no cookie is set or cleared', () => {
    const response = visit('https://carsi.com.au/courses/x?ref=someone-else', { cookie: 'carsi_ref=ccw' });
    expect(response.cookies.get('carsi_ref')).toBeUndefined();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('sets nothing on a page without a ref', () => {
    const response = visit('https://carsi.com.au/courses/x');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('sets nothing on a router prefetch', () => {
    const response = visit('https://carsi.com.au/courses/x?ref=ccw', { 'next-router-prefetch': '1' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
