/**
 * CCW/CARSI attendance foundation (unit A) — EVENT-SCOPED check-in token.
 *
 * This token is NOT an `admin_session` and NOT a user session. It authorises
 * exactly one thing: creating/advancing ONE sign-in for ONE event on ONE
 * calendar day (self-service door path). An admin mints a fresh token per event
 * per day (§9/§12(c)); the venue QR / link carries it.
 *
 * Signing reuses the shared HS256 session secret (`getSessionSecretBytes`) and
 * jose `SignJWT`/`jwtVerify`, mirroring `src/lib/auth/session-jwt.ts`. The
 * date-stamp comparison is constant-time (sha256 digests + `timingSafeEqual`),
 * mirroring `src/lib/server/cron-auth.ts`.
 *
 * Server-only (Node): imports `node:crypto`. Never import into client code.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

const CHECKIN_AUDIENCE = 'ccw-roadshow-checkin';
const CHECKIN_PURPOSE = 'ccw_checkin';

/**
 * Default lifetime of a minted day token — long enough to cover an 8:30am–4:30pm
 * event day plus setup/idle, short enough that a leaked QR dies the same day.
 * Defence-in-depth: even inside this window the `dateStamp` check (below) rejects
 * a token once the event-local calendar day rolls over.
 */
export const CHECKIN_TOKEN_TTL_SECONDS = 14 * 60 * 60; // 14 hours

/** IANA zone the CCW event days are anchored to (AEST/AEDT). */
const EVENT_TIME_ZONE = 'Australia/Sydney';

export type CheckInDayIndex = 1 | 2;

export interface CheckInTokenScope {
  eventSlug: string;
  dayIndex: CheckInDayIndex;
  /** YYYY-MM-DD in the event-local (AU eastern) calendar. */
  dateStamp: string;
}

export type CheckInTokenResult =
  | { ok: true; scope: CheckInTokenScope }
  | { ok: false; reason: 'invalid' | 'wrong_day' };

/** Event-local (AU eastern) YYYY-MM-DD stamp for a given instant. */
export function eventDayStamp(date: Date = new Date()): string {
  // `en-CA` formats as YYYY-MM-DD; the timeZone anchors it to the venue's day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a, 'utf8').digest();
  const db = createHash('sha256').update(b, 'utf8').digest();
  return da.length === db.length && timingSafeEqual(da, db);
}

/**
 * Mint a signed, event-day-scoped check-in token. Admin-only callers pass the
 * event + day; `dateStamp` defaults to today's event-local day.
 */
export async function mintCheckInToken(
  input: { eventSlug: string; dayIndex: CheckInDayIndex; dateStamp?: string; now?: Date },
  ttlSeconds: number = CHECKIN_TOKEN_TTL_SECONDS,
): Promise<string> {
  const dateStamp = input.dateStamp ?? eventDayStamp(input.now ?? new Date());
  const iat = Math.floor((input.now?.getTime() ?? Date.now()) / 1000);
  return new SignJWT({ purpose: CHECKIN_PURPOSE, dayIndex: input.dayIndex, dateStamp })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.eventSlug)
    .setAudience(CHECKIN_AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + ttlSeconds)
    .sign(getSessionSecretBytes());
}

/**
 * Verify a check-in token. Returns the scope only when the signature, audience,
 * purpose, and expiry all pass AND the embedded `dateStamp` still equals the
 * current event-local day (so a token cannot roll into the next day even inside
 * its exp window). `now` is injectable for tests.
 */
export async function verifyCheckInToken(
  token: string | undefined | null,
  opts?: { now?: Date },
): Promise<CheckInTokenResult> {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'invalid' };
  try {
    const { payload } = await jwtVerify(token, getSessionSecretBytes(), {
      audience: CHECKIN_AUDIENCE,
    });
    if (payload.purpose !== CHECKIN_PURPOSE) return { ok: false, reason: 'invalid' };

    const eventSlug = typeof payload.sub === 'string' ? payload.sub : '';
    const rawDay = payload.dayIndex;
    const dayIndex: CheckInDayIndex | null = rawDay === 1 ? 1 : rawDay === 2 ? 2 : null;
    const dateStamp = typeof payload.dateStamp === 'string' ? payload.dateStamp : '';
    if (!eventSlug || dayIndex == null || !dateStamp) return { ok: false, reason: 'invalid' };

    const today = eventDayStamp(opts?.now ?? new Date());
    if (!constantTimeEqual(dateStamp, today)) return { ok: false, reason: 'wrong_day' };

    return { ok: true, scope: { eventSlug, dayIndex, dateStamp } };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
