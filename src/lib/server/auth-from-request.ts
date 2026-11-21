import type { NextRequest } from 'next/server';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { verifyActiveSession } from '@/lib/server/user-active-cache';

/** Bearer token or `auth_token` cookie (httpOnly). */
export async function getSessionClaimsFromRequest(
  request: NextRequest
): Promise<SessionClaims | null> {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const claims = await verifyActiveSession(auth.slice(7).trim());
    if (claims) return claims;
  }

  const cookie = request.cookies.get('auth_token')?.value;
  if (cookie) {
    const claims = await verifyActiveSession(cookie);
    if (claims) return claims;
  }

  const carsi = request.cookies.get('carsi_token')?.value;
  if (carsi) {
    const claims = await verifyActiveSession(carsi);
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
