import { isCurrentGeneration } from '@/lib/auth/session-generation';
import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { readLmsUserNow } from '@/lib/server/lms-auth';

/**
 * Per-request "is this session still current?" check (Phase 8, 2026-06-29 audit; GP-760).
 *
 * LMS sessions are 7-day JWTs with no server-side store, so the database decides, on EVERY
 * request and for EVERY role, whether a signed session is still current (readLmsUserNow: one
 * primary-key statement). A session is current only while:
 *   - the user exists and is active (a deactivated or deleted user loses access on the next request);
 *   - it carries the user's current session generation (GP-760: a password write ends every older
 *     session of that user, setPasswordEndingSessions / consumePasswordReset);
 *   - its role is the user's effective database role now. The client then renews through
 *     /api/auth/refresh, which mints the current role from the database.
 *
 * There is no in-process cache (GP-760 review of f512fd90): a per-instance cache let another
 * instance keep accepting a session that a password reset had ended until its entry expired.
 * And the check FAILS CLOSED: if the database cannot be read, freshness is unknown and the session
 * is refused. (Before, learner tokens failed open on a database error, which accepted an ended
 * session during an outage.)
 */
export interface UserSessionState {
  active: boolean;
  /** Effective database role now (pickSessionRole). */
  role: string;
  /** lms_users.session_generation (session-generation.ts). */
  generation: number;
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

/**
 * True when the user is active, the session generation is current and its role is current, read
 * from the database now. False when the database cannot be read (fails closed).
 */
export async function isLmsSessionCurrent(claims: SessionClaims): Promise<boolean> {
  try {
    return sessionMatchesState(claims, await fetchSessionState(claims.sub));
  } catch (e) {
    console.error(
      '[auth] session re-check failed; refusing:',
      e instanceof Error ? e.message : String(e)
    );
    return false;
  }
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
