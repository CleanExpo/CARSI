import type { NextRequest } from 'next/server';

import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';
import { isLmsSessionCurrent } from '@/lib/server/user-active-cache';

/**
 * Which session credential a request handler acts on (GP-760). The ONE rule, used by
 * getSessionClaimsFromRequest (auth-from-request.ts), checkout and /api/auth/me:
 *
 *   1. `Authorization: Bearer <token>`
 *   2. the `auth_token` cookie
 *   3. the `carsi_token` cookie (login sets it to the same token as `auth_token`)
 *
 * Each supplied credential that carries a valid signature is checked by the authoritative server
 * rule (isLmsSessionCurrent: active user, current session generation, current role, read from the
 * database now, failing closed). The FIRST CURRENT one wins, and its claims carry the user id and
 * the email together. A stale credential never hides a current one supplied beside it: a browser
 * can hold an old cookie while an API client sends a fresh Bearer token, or the reverse.
 *
 * A token without a valid signature is not a session and is ignored (`none` when nothing else is
 * supplied). `refused` means at least one signed credential was supplied and none is current: the
 * caller must not fall back to a guest path that would act on that token's identity.
 */
export const SESSION_CREDENTIAL_ORDER = ['bearer', 'auth_token', 'carsi_token'] as const;

export type SessionCredentialSource = (typeof SESSION_CREDENTIAL_ORDER)[number];

export type SessionCredentialResolution =
  | { kind: 'current'; claims: SessionClaims; source: SessionCredentialSource }
  | { kind: 'refused' }
  | { kind: 'none' };

function credentialToken(request: NextRequest, source: SessionCredentialSource): string | undefined {
  if (source === 'bearer') {
    const auth = request.headers.get('authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7).trim() || undefined : undefined;
  }
  return request.cookies.get(source)?.value || undefined;
}

export async function resolveCurrentSessionCredential(
  request: NextRequest
): Promise<SessionCredentialResolution> {
  let refused = false;
  for (const source of SESSION_CREDENTIAL_ORDER) {
    const token = credentialToken(request, source);
    if (!token) continue;
    const claims = await verifySessionToken(token);
    if (!claims) continue;
    if (await isLmsSessionCurrent(claims)) return { kind: 'current', claims, source };
    refused = true;
  }
  return refused ? { kind: 'refused' } : { kind: 'none' };
}
