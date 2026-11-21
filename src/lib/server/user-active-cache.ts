import { issuedWithinCutoff } from '@/lib/auth/session-cutoff';
import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { readLmsUserNow } from '@/lib/server/current-admin';

/**
 * Per-request "is this session still current?" check (Phase 8, 2026-06-29 audit; GP-760).
 *
 * LMS sessions are 7-day JWTs with no server-side store. This re-check reads the user once
 * (readLmsUserNow: one statement) with a short in-process cache, so most requests make no DB hit.
 * A session is current only while:
 *   - the user is active (a deactivated/deleted user loses access within the TTL, not 7 days);
 *   - it was issued within the user's sessions cut-off (GP-760: a successful password reset ends
 *     every other session of that user);
 *   - its role is the user's effective database role now (GP-760: a demoted admin or instructor
 *     stops passing token-role checks within the TTL). The client then renews through
 *     /api/auth/refresh, which mints the current role from the database.
 *
 * Fail-open on DB error (the JWT is already signature-verified; we don't want a transient DB blip
 * to 401 the whole site) — but an explicit "user not found" is treated as inactive (deleted
 * account → revoke). Admin access does NOT use this cache: getAdminSessionOrNull reads the
 * database on every request and fails closed.
 */
export const ACTIVE_TTL_MS = 30_000;

export interface UserSessionState {
  active: boolean;
  /** Effective database role now (pickSessionRole). */
  role: string;
  /** sessions_valid_after_sec, or null when the user has no cut-off. */
  validAfterSec: number | null;
}

interface Entry {
  state: UserSessionState;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

/**
 * Testable core: cache + fail-open policy with injectable clock and fetcher. Returns null when the
 * fetch failed (fail open; not cached, so the next request retries).
 */
export async function resolveSessionState(
  userId: string,
  now: number,
  fetcher: (id: string) => Promise<UserSessionState>,
): Promise<UserSessionState | null> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > now) return hit.state;

  let state: UserSessionState;
  try {
    state = await fetcher(userId);
  } catch (e) {
    console.warn('[auth] session re-check failed; allowing (fail-open):', e);
    return null; // do NOT cache a fail-open result — retry next request
  }

  cache.set(userId, { state, expiresAt: now + ACTIVE_TTL_MS });
  return state;
}

/** Drop one user's cached state on this instance (after a password reset changes it). */
export function forgetSessionState(userId: string): void {
  cache.delete(userId);
}

/** Clear the cache (tests only). */
export function __clearActiveCache(): void {
  cache.clear();
}

/** True when a session with these claims still matches the user's state (see the file comment). */
export function sessionMatchesState(claims: SessionClaims, state: UserSessionState): boolean {
  if (!state.active) return false;
  if (!issuedWithinCutoff(claims.iat, state.validAfterSec)) return false;
  return claims.role.trim().toLowerCase() === state.role;
}

async function fetchSessionState(id: string): Promise<UserSessionState> {
  const user = await readLmsUserNow(prisma, id);
  if (!user) return { active: false, role: '', validAfterSec: null }; // unknown/deleted → inactive
  return user;
}

/** True when the user is active, the session is within the cut-off and its role is current. */
export async function isLmsSessionCurrent(claims: SessionClaims): Promise<boolean> {
  const state = await resolveSessionState(claims.sub, Date.now(), fetchSessionState);
  if (!state) return true; // fail open, see above
  return sessionMatchesState(claims, state);
}

/**
 * The ONE reader for "a signed LMS session token that is still current": signature, then the
 * active, cut-off and role re-check. Used by request handlers (auth-from-request) and server
 * components (session-server).
 */
export async function verifyActiveSession(token: string): Promise<SessionClaims | null> {
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  if (!(await isLmsSessionCurrent(claims))) return null;
  return claims;
}
