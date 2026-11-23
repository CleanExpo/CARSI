import type { NextRequest } from 'next/server';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { resolveCurrentSessionCredential } from '@/lib/server/session-credential';

/**
 * The current session's claims: Bearer token, then `auth_token`, then `carsi_token`, the first one
 * the server confirms as current (resolveCurrentSessionCredential holds the order and the rule).
 */
export async function getSessionClaimsFromRequest(
  request: NextRequest
): Promise<SessionClaims | null> {
  const resolved = await resolveCurrentSessionCredential(request);
  return resolved.kind === 'current' ? resolved.claims : null;
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
