import { isCurrentGeneration } from '@/lib/auth/session-generation';
import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { readLmsUserNow } from '@/lib/server/lms-auth';

/**
 * Per-request "is this session still current?" check (Phase 8, 2026-06-29 audit; GP-760).
 *
 * LMS sessions are 7-day JWTs with no server-side store. This re-check reads the user once
 * (readLmsUserNow: one statement) with a short in-process cache, so most requests make no DB hit.
 * A session is current only while:
 *   - the user is active (a deactivated/deleted user loses access within the TTL, not 7 days);
 *   - it carries the user's current session generation (GP-760: a successful password reset ends
 *     every other session of that user);
 *   - its role is the user's effective database role now. The client then renews through
 *     /api/auth/refresh, which mints the current role from the database.
 *
 * STAFF TOKENS ARE NEVER CACHED (GP-760, Phill's ruling 22/11/2026: admin and instructor role
 * gates follow a demotion within one request). A token claiming a staff role is re-read from the
 * database on every request and refused if the read fails (fail closed), because these claims feed
 * staff gates (staff lesson auto-enrolment, practical-assessment review, course authoring).
 *
 * Learner tokens use the cache and fail OPEN on a DB error (the JWT is already
 * signature-verified; a transient DB blip must not 401 the whole site) — but an explicit "user not
 * found" is treated as inactive (deleted account → revoke).
 */
export const ACTIVE_TTL_MS = 30_000;

export interface UserSessionState {
  active: boolean;
  /** Effective database role now (pickSessionRole). */
  role: string;
  /** lms_users.session_generation (session-generation.ts). */
  generation: number;
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
  if (!isCurrentGeneration(claims.sg, state.generation)) return false;
  return claims.role.trim().toLowerCase() === state.role;
}

async function fetchSessionState(id: string): Promise<UserSessionState> {
  const user = await readLmsUserNow(prisma, id);
  if (!user) return { active: false, role: '', generation: 0 }; // unknown/deleted → inactive
  return { active: user.active, role: user.role, generation: user.generation };
}

/** Roles whose token is re-read on every request (see the file comment). */
const STAFF_ROLES = new Set(['admin', 'instructor']);

/** True for a token that claims a staff role, so it must never be served from the cache. */
export function isStaffTokenRole(role: string): boolean {
  return STAFF_ROLES.has(role.trim().toLowerCase());
}

/** True when the user is active, the session generation is current and its role is current. */
export async function isLmsSessionCurrent(claims: SessionClaims): Promise<boolean> {
  if (isStaffTokenRole(claims.role)) {
    try {
      const state = await fetchSessionState(claims.sub);
      cache.set(claims.sub, { state, expiresAt: Date.now() + ACTIVE_TTL_MS });
      return sessionMatchesState(claims, state);
    } catch (e) {
      console.error(
        '[auth] staff session re-check failed; refusing:',
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const state = await resolveSessionState(claims.sub, Date.now(), fetchSessionState);
  if (!state) return true; // fail open, see above
  return sessionMatchesState(claims, state);
}

/**
 * The ONE reader for "a signed LMS session token that is still current": signature, then the
 * active, session generation and role re-check. Used by request handlers (auth-from-request) and server
 * components (session-server).
 */
export async function verifyActiveSession(token: string): Promise<SessionClaims | null> {
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  if (!(await isLmsSessionCurrent(claims))) return null;
  return claims;
}
