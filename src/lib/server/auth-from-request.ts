import type { NextRequest } from 'next/server';

import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

/** Bearer token or `auth_token` cookie (httpOnly). */
export async function getSessionClaimsFromRequest(
  request: NextRequest
): Promise<SessionClaims | null> {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const claims = await verifySessionToken(auth.slice(7).trim());
    if (claims) return claims;
  }

  const cookie = request.cookies.get('auth_token')?.value;
  if (cookie) {
    const claims = await verifySessionToken(cookie);
    if (claims) return claims;
  }

  const carsi = request.cookies.get('carsi_token')?.value;
  if (carsi) {
    const claims = await verifySessionToken(carsi);
    if (claims) return claims;
  }

  return null;
}

/** Bearer header for upstream LMS proxy (Authorization header or session cookie). */
export function getBearerAuthorizationFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth;
  }

  const cookie =
    request.cookies.get('auth_token')?.value ?? request.cookies.get('carsi_token')?.value;
  if (cookie) {
    return `Bearer ${cookie}`;
  }

  return null;
}
