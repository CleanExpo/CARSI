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
 *    protects (plus a short time window only when the request carries nothing that tells one
 *    attempt from the next, see `courseCheckoutIdempotencyKey`), so a double-click or a retry of
 *    the same purchase gets the first session back, and any change to the purchase (course,
 *    price, seats, buyer, return links, metadata) is a different key by construction.
 *
 * Hashing keeps internal ids and emails out of Stripe logs and bounds the key length.
 *
 * The guard (GP-789). A key is only worth sending if this module made it, for this request.
 * `createKeyedCheckoutSession` is the checkout create that checks that at run time: it refuses a
 * key this module never issued (a hand-made one, or a shadowed builder's) and a course key issued
 * for a different request. The test that scans the source for unkeyed creates is only a hint (see
 * checkout-idempotency-owner.test.ts for its limits); this check runs on the real call.
 */
import { createHash } from 'node:crypto';

import type Stripe from 'stripe';

import { PURCHASE_SURVEY_BINDING_METADATA_KEY } from '@/lib/server/purchase-survey-token';

export type CheckoutReservationKind = 'individual' | 'team' | 'org' | 'onboarding';

/** A Checkout idempotency key this module issued. Only the builders below return one. */
export type CheckoutIdempotencyKey = string & { readonly __ownerKey: unique symbol };

/**
 * Every key issued by this process, with the digest of the request a course key protects (null for
 * a reservation key, which protects no single request body). Bounded: the oldest entry drops first.
 * A key is issued and used within one request, so the process that checks it is the one that made it.
 */
const ISSUED = new Map<string, string | null>();
const ISSUED_LIMIT = 5000;

function issue(key: string, requestDigest: string | null): CheckoutIdempotencyKey {
  ISSUED.delete(key);
  ISSUED.set(key, requestDigest);
  if (ISSUED.size > ISSUED_LIMIT) {
    const oldest = ISSUED.keys().next().value;
    if (oldest !== undefined) ISSUED.delete(oldest);
  }
  return key as CheckoutIdempotencyKey;
}

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
): CheckoutIdempotencyKey {
  const ownerHash = sha256Hex(ownerId.trim()).slice(0, 32);
  return issue(`carsi:${kind}:${ownerHash}:${reservedAt.getTime()}`, null);
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

function requestDigest(request: Stripe.Checkout.SessionCreateParams): string {
  return sha256Hex(canonicalJson(request));
}

/**
 * The key for one course purchase: the exact Checkout Session request, hashed. A different
 * purchase never shares a key, so Stripe can never refuse it for mismatched parameters.
 *
 * How long a repeat gets the first session back depends on who bounds it:
 *  - A request that carries the tab's purchase-survey binding (GP-662) is already one attempt:
 *    the browser keeps its key for the repeat window and then makes a new one, which changes the
 *    request and so the key. The server adds no clock of its own (GP-789): a server window would
 *    roll over at a wall-clock boundary inside the browser's window, so a repeat just across it
 *    would open a second session.
 *  - A request with no binding has nothing else to tell one attempt from the next, so it falls
 *    back to a wall-clock window. A repeat that straddles a window edge can still open a second
 *    session; that is a named limit of an anonymous request, not something a key can fix.
 */
export function courseCheckoutIdempotencyKey(
  request: Stripe.Checkout.SessionCreateParams,
  now: Date = new Date()
): CheckoutIdempotencyKey {
  const digest = requestDigest(request);
  const binding = request.metadata?.[PURCHASE_SURVEY_BINDING_METADATA_KEY];
  const bound = typeof binding === 'string' && binding.length > 0;
  const suffix = bound ? 'k' : String(Math.floor(now.getTime() / COURSE_CHECKOUT_REPEAT_WINDOW_MS));
  return issue(`carsi:course:${digest.slice(0, 40)}:${suffix}`, digest);
}

/**
 * Open a Checkout Session with a key this module issued (GP-789). Refuses, before any request,
 * a key this module never made (`CHECKOUT_KEY_NOT_FROM_OWNER`) and a course key made for a
 * different request (`CHECKOUT_KEY_FOR_OTHER_REQUEST`). The key goes in the options here, after
 * `options`, so nothing passed in can replace it.
 */
export async function createKeyedCheckoutSession(
  stripe: Pick<Stripe, 'checkout'>,
  request: Stripe.Checkout.SessionCreateParams,
  key: CheckoutIdempotencyKey,
  options: Omit<Stripe.RequestOptions, 'idempotencyKey'> = {}
): Promise<Stripe.Checkout.Session> {
  const digest = ISSUED.get(key);
  if (digest === undefined) throw new Error('CHECKOUT_KEY_NOT_FROM_OWNER');
  if (digest !== null && digest !== requestDigest(request)) {
    throw new Error('CHECKOUT_KEY_FOR_OTHER_REQUEST');
  }
  return stripe.checkout.sessions.create(request, { ...options, idempotencyKey: key });
}

/**
 * Network retries for a keyed course checkout. A second click that arrives while the first is
 * still being created gets HTTP 409 from Stripe ("key in use"); the Stripe library retries a 409
 * with backoff (0.5 s, 1 s, 2 s, 4 s), and the retry then receives the first click's session.
 * The library default of 2 retries (about 1.5 s) can end before a slow create finishes.
 */
export const COURSE_CHECKOUT_MAX_NETWORK_RETRIES = 4;
