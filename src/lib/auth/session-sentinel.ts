/**
 * A non-httpOnly cookie that mirrors whether the visitor holds a verified session.
 *
 * The session cookies themselves are httpOnly, so the browser cannot know it is anonymous; before
 * this, every public page cost every visitor two 401s (/api/auth/me, then the client's automatic
 * /api/auth/refresh) just to learn that (WS1 break 12, GP-547). The sentinel carries no secret,
 * only the fact that a session exists; the middleware keeps it in step with the verified session
 * on every page request, and the auth routes set or clear it for immediacy.
 */
export const SESSION_SENTINEL_COOKIE = 'carsi_session';

/**
 * The only value this cookie may ever hold. It is a presence flag, never a token, JWT,
 * session id, or role. Anything else is treated as absent.
 */
export const SESSION_SENTINEL_VALUE = '1';

/** Matches the session cookies' lifetime (seven days). */
export const SESSION_SENTINEL_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionSentinelAction = 'set' | 'clear' | 'keep';

/**
 * What a response should do with the sentinel: set it when a session exists and the request
 * lacks it, clear it when no session exists and the request carries it, otherwise nothing, so
 * ordinary responses carry no Set-Cookie.
 */
export function sessionSentinelAction(
  hasSession: boolean,
  requestHasSentinel: boolean
): SessionSentinelAction {
  if (hasSession && !requestHasSentinel) return 'set';
  if (!hasSession && requestHasSentinel) return 'clear';
  return 'keep';
}

/** Cookie options for the sentinel: readable by scripts on purpose, otherwise like the session cookies. */
export function sessionSentinelCookieOptions(isProduction: boolean) {
  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** Whether a Cookie header (or document.cookie) carries the sentinel. */
export function hasSessionSentinel(cookieHeader: string): boolean {
  return cookieHeader
    .split(';')
    .some((part) => part.trim() === `${SESSION_SENTINEL_COOKIE}=${SESSION_SENTINEL_VALUE}`);
}
