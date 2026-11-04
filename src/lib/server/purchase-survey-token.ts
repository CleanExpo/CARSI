/**
 * Capability for the payment-success survey (Authority Machine slice 1b).
 *
 * A Checkout Session id appears in the success URL, so holding one must not be enough to write
 * survey answers onto someone's payment. The capability is a random per-browser key in an
 * HttpOnly cookie. When checkout creates a Stripe session it stores a binding of that key in the
 * session's own metadata (`svy_bk`); the survey route accepts only when the browser's key
 * matches the binding on the posted session.
 *
 * One key per browser, not one token per checkout (GP-662). Overlapping checkout starts all read
 * and write the same key, so no reply can overwrite another checkout's capability, there is only
 * ever one cookie, and nothing depends on the order or count of cookies the browser sends. The
 * proxy sets the key on the first page view, before any checkout starts, so even a browser's
 * first two checkouts share it.
 *
 * Cookie value: `<32 hex key>.<hex HMAC-SHA256 over a label and the key>`. Binding: a second,
 * differently labelled HMAC of the key, cut to 32 hex. Both keyed with the existing session
 * secret (JWT_SECRET). No new secret. The cookie never leaves the browser and our server; Stripe
 * holds only the binding.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

export const PURCHASE_SURVEY_COOKIE_NAME = 'carsi_svk';
/** Checkout Session metadata key that carries the binding. */
export const PURCHASE_SURVEY_BINDING_METADATA_KEY = 'svy_bk';
/** The browser key lasts 30 days; each checkout start refreshes it with the same value. */
export const PURCHASE_SURVEY_KEY_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Answers are accepted for 24 hours after the Checkout Session was created. */
export const PURCHASE_SURVEY_WINDOW_SECONDS = 60 * 60 * 24;

const COOKIE_SHAPE = /^([0-9a-f]{32})\.([0-9a-f]{64})$/;
const BINDING_SHAPE = /^[0-9a-f]{32}$/;

function hmac(label: string, key: string): string {
  return createHmac('sha256', getSessionSecretBytes()).update(label).update(key).digest('hex');
}

function cookieMac(key: string): string {
  return hmac('carsi:purchase-survey-key:v2\0', key);
}

/** The binding stored on a Checkout Session for this browser key. */
export function purchaseSurveyBinding(key: string): string {
  return hmac('carsi:purchase-survey-binding:v2\0', key).slice(0, 32);
}

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** The browser key when the cookie value is ours and unmodified, else null. Never throws. */
export function purchaseSurveyKeyFromCookie(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = COOKIE_SHAPE.exec(value);
  if (!match) return null;
  return sameHex(match[2], cookieMac(match[1])) ? match[1] : null;
}

/** A new cookie value holding a fresh random 128-bit key. */
export function newPurchaseSurveyCookieValue(): string {
  const key = randomBytes(16).toString('hex');
  return `${key}.${cookieMac(key)}`;
}

/**
 * The cookie a checkout start uses: the browser's existing valid one, unchanged, or a new one
 * when it has none. Reusing the value is what makes overlapping starts safe.
 */
export function purchaseSurveyCookieForCheckout(existing: string | null | undefined): {
  value: string;
  key: string;
} {
  const key = purchaseSurveyKeyFromCookie(existing);
  if (key) return { value: existing as string, key };
  const value = newPurchaseSurveyCookieValue();
  return { value, key: value.slice(0, 32) };
}

/** Cookie attributes, shared by the proxy and the checkout route so both write the same cookie. */
export function purchaseSurveyCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PURCHASE_SURVEY_KEY_MAX_AGE_SECONDS,
  };
}

/**
 * True when the browser's cookie verifies and its key's binding equals the one stored on this
 * Checkout Session, and the session is less than 24 hours old.
 */
export function sessionAuthorisedForSurvey(
  session: { metadata?: Record<string, string> | null; created?: number | null },
  cookieValue: string | null | undefined,
  now: Date = new Date()
): boolean {
  const key = purchaseSurveyKeyFromCookie(cookieValue);
  const stored = session.metadata?.[PURCHASE_SURVEY_BINDING_METADATA_KEY];
  if (!key || typeof stored !== 'string' || !BINDING_SHAPE.test(stored)) return false;
  const created = session.created;
  if (typeof created !== 'number' || !Number.isFinite(created)) return false;
  const ageSeconds = Math.floor(now.getTime() / 1000) - created;
  // Five minutes of allowance for clock difference between Stripe and this server.
  if (ageSeconds < -300 || ageSeconds > PURCHASE_SURVEY_WINDOW_SECONDS) return false;
  return sameHex(stored, purchaseSurveyBinding(key));
}
