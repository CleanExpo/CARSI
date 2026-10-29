/**
 * Capability token for the payment-success survey (Authority Machine slice 1b).
 *
 * A Checkout Session id appears in the success URL, so holding one must not be enough to write
 * survey answers onto someone's payment. When checkout creates the session it sets this token
 * as an HttpOnly cookie; the survey route accepts only when the cookie verifies for the posted
 * session id and has not expired.
 *
 * Token: `<expiry unix seconds>.<hex HMAC-SHA256>` over a domain-separated label, the session
 * id and the expiry, keyed with the existing session secret (JWT_SECRET). No new secret.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

export const PURCHASE_SURVEY_COOKIE_NAME = 'carsi_svy';
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
