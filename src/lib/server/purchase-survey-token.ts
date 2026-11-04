/**
 * Capability for the payment-success survey (Authority Machine slice 1b).
 *
 * A Checkout Session id appears in the success URL, so holding one must not be enough to write
 * survey answers onto someone's payment. The capability is a random per-tab key that the
 * browser tab keeps in sessionStorage (`src/lib/marketing/purchase-survey-key.ts`) and sends
 * with its checkout request. Checkout stores a binding of that key in the new session's own
 * metadata (`svy_bk`); the survey route accepts only when the tab sends a key whose binding
 * matches the posted session.
 *
 * Why a tab key and not a cookie (GP-662): two replies that write the same cookie name with
 * different values are last-writer-wins, and the server cannot see two replies in flight, so
 * any cookie the server creates can overwrite another checkout's capability. A tab's own
 * script makes and reuses its key one step at a time, different tabs have separate
 * sessionStorage, and the server writes nothing to the browser, so overlapping checkouts
 * cannot overwrite each other.
 *
 * Binding: HMAC-SHA256 over a label and the key, keyed with the existing session secret
 * (JWT_SECRET), cut to 32 hex. No new secret. Stripe holds only the binding, never the key.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

/** Checkout Session metadata key that carries the binding. */
export const PURCHASE_SURVEY_BINDING_METADATA_KEY = 'svy_bk';
/** Answers are accepted for 24 hours after the Checkout Session was created. */
export const PURCHASE_SURVEY_WINDOW_SECONDS = 60 * 60 * 24;

const KEY_SHAPE = /^[0-9a-f]{32}$/;

/** The tab key when `value` has the exact shape the client helper makes, else null. */
export function parsePurchaseSurveyKey(value: unknown): string | null {
  return typeof value === 'string' && KEY_SHAPE.test(value) ? value : null;
}

/** The binding stored on a Checkout Session for this tab key. */
export function purchaseSurveyBinding(key: string): string {
  return createHmac('sha256', getSessionSecretBytes())
    .update('carsi:purchase-survey-binding:v3\0')
    .update(key)
    .digest('hex')
    .slice(0, 32);
}

/**
 * True when `key` is well formed, its binding equals the one stored on this Checkout Session,
 * and the session is at most 24 hours old (with five minutes of clock allowance).
 */
export function sessionAuthorisedForSurvey(
  session: { metadata?: Record<string, string> | null; created?: number | null },
  key: unknown,
  now: Date = new Date()
): boolean {
  const tabKey = parsePurchaseSurveyKey(key);
  const stored = session.metadata?.[PURCHASE_SURVEY_BINDING_METADATA_KEY];
  if (!tabKey || typeof stored !== 'string' || !KEY_SHAPE.test(stored)) return false;
  const created = session.created;
  if (typeof created !== 'number' || !Number.isFinite(created)) return false;
  const ageSeconds = Math.floor(now.getTime() / 1000) - created;
  // Five minutes of allowance for clock difference between Stripe and this server.
  if (ageSeconds < -300 || ageSeconds > PURCHASE_SURVEY_WINDOW_SECONDS) return false;
  return timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(purchaseSurveyBinding(tabKey), 'hex'));
}
