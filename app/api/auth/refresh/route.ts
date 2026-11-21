import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken, verifySessionToken } from '@/lib/auth/session-jwt';
import { SESSION_SENTINEL_COOKIE } from '@/lib/auth/session-sentinel';
import { applyDurableRateLimit, retryAfterSeconds } from '@/lib/server/durable-rate-limit';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// GP-760: renewals per signed-in user. The client renews on a 401, so a real user needs a few per
// hour; this stops a held token being renewed in a tight loop. Keyed by user, not IP, so people
// behind one office address do not share a bucket.
const REFRESH_LIMIT = 30;
const REFRESH_WINDOW_MS = 15 * 60 * 1000;

/** Same options as /api/auth/logout, so the browser replaces (and drops) the same cookies. */
function clearSession(response: NextResponse): NextResponse {
  const clearOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
  response.cookies.set('auth_token', '', { ...clearOptions, httpOnly: true });
  response.cookies.set('carsi_token', '', { ...clearOptions, httpOnly: true });
  response.cookies.set(SESSION_SENTINEL_COOKIE, '', { ...clearOptions, httpOnly: false });
  return response;
}

/**
 * Renew the session cookie. GP-760: the new token is minted from the database, never by
 * re-signing the old claims: the user must still be active, the old session must have been issued
 * within the user's sessions cut-off (a password reset ends it), and the role is the current
 * database role, so a demoted admin's renewal carries the demoted role.
 */
export async function POST(request: NextRequest) {
  const currentToken = request.cookies.get('auth_token')?.value;
  if (!currentToken) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 });
  }

  const cookieOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };

  const claims = await verifySessionToken(currentToken);
  if (!claims) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const rl = await applyDurableRateLimit(`auth-refresh:${claims.sub}`, REFRESH_LIMIT, REFRESH_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': retryAfterSeconds(rl.resetAt) } }
    );
  }

  let current;
  try {
    current = await sessionClaimsForUserId(claims.sub, { issuedAt: claims.iat ?? 0 });
  } catch (e) {
    console.error('[auth/refresh] account re-check failed:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Session service unavailable' }, { status: 503 });
  }
  if (!current) {
    return clearSession(NextResponse.json({ error: 'Session expired' }, { status: 401 }));
  }

  const refreshed = await signSessionToken(current);

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', refreshed, { ...cookieOptions, httpOnly: true });
  response.cookies.set('carsi_token', refreshed, { ...cookieOptions, httpOnly: true });
  response.cookies.set(SESSION_SENTINEL_COOKIE, '1', { ...cookieOptions, httpOnly: false });
  return response;
}
