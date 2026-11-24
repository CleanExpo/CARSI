/**
 * The one owner of every Stripe Checkout idempotency key CARSI sends (GP-783).
 *
 * Stripe stores the first response for a key and returns it to any later request carrying the
 * same key, so a repeated request gets the SAME Checkout Session instead of a second one. Stripe
 * refuses a reused key whose request parameters differ, so a key must change whenever the
 * request it protects changes.
 *
 * Two shapes, one module:
 *  - Membership, Teams, org and onboarding checkouts hold a database reservation first. Their
 *    key is the reservation (kind, owner, reservation time): stable for one reservation,
 *    different for the next legitimate one.
 *  - A course purchase ("Buy course") holds no reservation. Its key is the exact request it
 *    protects plus a short time window, so a double-click or a retry of the same purchase within
 *    the window gets the first session back, and any change to the purchase (course, price,
 *    seats, buyer, return links, metadata) is a different key by construction.
 *
 * Hashing keeps internal ids and emails out of Stripe logs and bounds the key length.
 */
import { createHash } from 'node:crypto';

import type Stripe from 'stripe';

export type CheckoutReservationKind = 'individual' | 'team' | 'org' | 'onboarding';

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Stable for one database reservation, different for the next legitimate one.
 *
 * Stripe may accept a Checkout Session and then lose the response. Supplying
 * this key lets its own network retries return that session instead of opening
 * another.
 */
export function checkoutSessionIdempotencyKey(
  kind: CheckoutReservationKind,
  ownerId: string,
  reservedAt: Date
): string {
  const ownerHash = sha256Hex(ownerId.trim()).slice(0, 32);
  return `carsi:${kind}:${ownerHash}:${reservedAt.getTime()}`;
}

/**
 * How long an identical course purchase keeps returning the same Checkout Session.
 *
 * Long enough to cover a double-click, a slow network retry and a buyer who presses "Buy course"
 * again after the first attempt seemed to stall. Short enough that a deliberate second identical
 * team purchase is held up for minutes, not hours. Well inside Stripe's 24-hour key retention and
 * the session's default 24-hour expiry, so the session handed back is still the stored one.
 */
export const COURSE_CHECKOUT_REPEAT_WINDOW_MS = 10 * 60 * 1000;

/** JSON with object keys sorted at every depth, so equal requests serialise identically. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * The key for one course purchase: the exact Checkout Session request, hashed, plus the repeat
 * window it falls in. The same purchase inside one window always gets the same key; a different
 * purchase never shares one, so Stripe can never refuse it for mismatched parameters.
 */
export function courseCheckoutIdempotencyKey(
  request: Stripe.Checkout.SessionCreateParams,
  now: Date = new Date()
): string {
  const window = Math.floor(now.getTime() / COURSE_CHECKOUT_REPEAT_WINDOW_MS);
  return `carsi:course:${sha256Hex(canonicalJson(request)).slice(0, 40)}:${window}`;
}

/**
 * Network retries for a keyed course checkout. A second click that arrives while the first is
 * still being created gets HTTP 409 from Stripe ("key in use"); the Stripe library retries a 409
 * with backoff (0.5 s, 1 s, 2 s, 4 s), and the retry then receives the first click's session.
 * The library default of 2 retries (about 1.5 s) can end before a slow create finishes.
 */
export const COURSE_CHECKOUT_MAX_NETWORK_RETRIES = 4;
