/**
 * Capability token for the payment-success survey (Authority Machine slice 1b).
 *
 * A Checkout Session id appears in the success URL, so holding one must not be enough to write
 * survey answers onto someone's payment. When checkout creates the session it sets this token
 * as an HttpOnly cookie; the survey route accepts only when that session's cookie verifies for
 * the posted session id and has not expired.
 *
 * Token: `<expiry unix seconds>.<hex HMAC-SHA256>` over a domain-separated label, the session
 * id and the expiry, keyed with the existing session secret (JWT_SECRET). No new secret.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

export const PURCHASE_SURVEY_TOKEN_TTL_SECONDS = 60 * 60 * 24;
/** Sent only to the checkout API routes, which include the survey route. */
export const PURCHASE_SURVEY_COOKIE_PATH = '/api/lms/checkout';

function mac(sessionId: string, exp: number): string {
  return createHmac('sha256', getSessionSecretBytes())
    .update('carsi:purchase-survey:v1\0')
    .update(sessionId)
    .update('\0')
    .update(String(exp))
    .digest('hex');
}

export function signPurchaseSurveyToken(sessionId: string, now: Date = new Date()): string {
  const exp = Math.floor(now.getTime() / 1000) + PURCHASE_SURVEY_TOKEN_TTL_SECONDS;
  return `${exp}.${mac(sessionId, exp)}`;
}

/**
 * One cookie per checkout: `carsi_svy_<first 16 hex of SHA-256(session id)>`, holding that
 * session's token. Separate names matter (GP-662): two checkouts started at the same moment both
 * read the same earlier cookies, and with one shared cookie the later Set-Cookie replaced the
 * other checkout's token. Each start now writes only its own cookie, so overlapping replies
 * cannot overwrite each other. The name is not a secret; the session id is in the success URL.
 */
export const PURCHASE_SURVEY_COOKIE_PREFIX = 'carsi_svy_';
const COOKIE_NAME_SHAPE = /^carsi_svy_[0-9a-f]{16}$/;
const TOKEN_SHAPE = /^(\d{1,12})\.[0-9a-f]{64}$/;

export function purchaseSurveyCookieName(sessionId: string): string {
  const digest = createHash('sha256').update(sessionId).digest('hex');
  return `${PURCHASE_SURVEY_COOKIE_PREFIX}${digest.slice(0, 16)}`;
}

/** At most this many checkouts are remembered; older ones are deleted at the next start. */
export const PURCHASE_SURVEY_MAX_TOKENS = 3;

/** The cookie changes for a checkout start: set this session's cookie, delete the listed names. */
export interface PurchaseSurveyCookieChanges {
  set: { name: string; value: string };
  expire: string[];
}

/**
 * Sets the new session's cookie and deletes earlier survey cookies beyond the two newest live
 * ones, plus any expired or malformed survey cookie. Overlapping starts can briefly leave one
 * extra cookie (neither saw the other); the next start trims it, so the count stays bounded.
 *
 * Newest means the latest expiry. Expiry has whole-second resolution, so a tie is broken by
 * position: browsers send cookies of one path oldest first (RFC 6265 section 5.4), so a later
 * position is the newer cookie.
 */
export function purchaseSurveyCookieChanges(
  existing: ReadonlyArray<{ name: string; value: string }>,
  sessionId: string,
  now: Date = new Date()
): PurchaseSurveyCookieChanges {
  const name = purchaseSurveyCookieName(sessionId);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const earlier = existing.filter((c) => COOKIE_NAME_SHAPE.test(c.name) && c.name !== name);
  const expiryOf = (value: string): number => {
    const match = TOKEN_SHAPE.exec(value);
    return match ? Number(match[1]) : -1;
  };
  const keep = new Set(
    earlier
      .map((c, position) => ({ name: c.name, exp: expiryOf(c.value), position }))
      .filter((c) => c.exp >= nowSeconds)
      .sort((a, b) => b.exp - a.exp || b.position - a.position)
      .slice(0, PURCHASE_SURVEY_MAX_TOKENS - 1)
      .map((c) => c.name)
  );
  return {
    set: { name, value: signPurchaseSurveyToken(sessionId, now) },
    expire: earlier.filter((c) => !keep.has(c.name)).map((c) => c.name),
  };
}

/** True when the request carries this session's survey cookie and its token verifies. */
export function requestAuthorisesSurvey(
  cookies: { get(name: string): { value: string } | undefined },
  sessionId: string,
  now: Date = new Date()
): boolean {
  return verifyPurchaseSurveyToken(cookies.get(purchaseSurveyCookieName(sessionId))?.value, sessionId, now);
}

export function verifyPurchaseSurveyToken(
  token: string | null | undefined,
  sessionId: string,
  now: Date = new Date()
): boolean {
  if (!token || !sessionId) return false;
  const match = /^(\d{1,12})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isSafeInteger(exp) || exp < Math.floor(now.getTime() / 1000)) return false;
  const expected = Buffer.from(mac(sessionId, exp), 'hex');
  const given = Buffer.from(match[2], 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
