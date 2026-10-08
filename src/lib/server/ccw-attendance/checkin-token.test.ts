import { decodeJwt } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  configuredEventDayStamp,
  configuredEventDayGuard,
  eventDayStamp,
  mintCheckInToken,
  verifyCheckInToken,
} from './checkin-token';

afterEach(() => vi.useRealTimers());

describe('October Brisbane occurrence day boundaries', () => {
  it('keeps the legacy Sydney default while accepting Brisbane venue dates', () => {
    const lateBrisbane = new Date('2026-10-09T13:30:00Z');
    expect(eventDayStamp(lateBrisbane)).toBe('2026-10-10');
    expect(eventDayStamp(lateBrisbane, 'Australia/Brisbane')).toBe('2026-10-09');
    expect(
      configuredEventDayGuard('2026-10-09T08:30:00+10:00', 1, lateBrisbane, 'Australia/Brisbane').ok
    ).toBe(true);
  });

  it('accepts the signed October subject at 23:30 AEST inside its original TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
    const token = await mintCheckInToken({ eventSlug: 'brisbane-2026-10-09', dayIndex: 1 });
    const payload = decodeJwt(token);
    expect(Object.keys(payload).sort()).toEqual([
      'aud',
      'dateStamp',
      'dayIndex',
      'exp',
      'iat',
      'purpose',
      'sub',
    ]);
    expect(payload.exp! - payload.iat!).toBe(14 * 60 * 60);
    expect(payload.sub).toBe('brisbane-2026-10-09');
    vi.setSystemTime(new Date('2026-10-09T13:30:00Z'));
    expect(await verifyCheckInToken(token)).toEqual({
      ok: true,
      scope: { eventSlug: 'brisbane-2026-10-09', dayIndex: 1, dateStamp: '2026-10-09' },
    });
  });

  it('rejects the same token at Brisbane midnight even while its TTL remains live', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
    const token = await mintCheckInToken({ eventSlug: 'brisbane-2026-10-09', dayIndex: 1 });
    vi.setSystemTime(new Date('2026-10-09T14:00:00Z'));
    expect(await verifyCheckInToken(token)).toEqual({ ok: false, reason: 'wrong_day' });
  });

  it('does not carry a historical Sydney-default token past its own local midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
    const token = await mintCheckInToken({ eventSlug: 'brisbane', dayIndex: 1 });
    vi.setSystemTime(new Date('2026-10-09T13:30:00Z'));
    expect(await verifyCheckInToken(token)).toEqual({ ok: false, reason: 'wrong_day' });
  });
});

/**
 * AC#15(h) — the event check-in token verifies signature/aud/purpose/exp AND
 * that the embedded event-local dateStamp is still today. A wrong day, an
 * expired token, or a garbage token are all rejected.
 */
describe('verifyCheckInToken', () => {
  it('derives the configured date for each event day', () => {
    expect(configuredEventDayStamp('2026-07-22T08:30:00+10:00', 1)).toBe('2026-07-22');
    expect(configuredEventDayStamp('2026-07-22T08:30:00+10:00', 2)).toBe('2026-07-23');
  });

  it('round-trips a freshly minted token and returns its scope', async () => {
    const dateStamp = eventDayStamp();
    const token = await mintCheckInToken({ eventSlug: 'melbourne', dayIndex: 1, dateStamp });
    const result = await verifyCheckInToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scope.eventSlug).toBe('melbourne');
      expect(result.scope.dayIndex).toBe(1);
      expect(result.scope.dateStamp).toBe(dateStamp);
    }
  });

  it('rejects a token whose event-local day has rolled over (wrong_day)', async () => {
    const token = await mintCheckInToken({
      eventSlug: 'melbourne',
      dayIndex: 1,
      dateStamp: '2026-07-22',
    });
    // A later calendar day in Australia/Sydney; token not yet expired.
    const result = await verifyCheckInToken(token, { now: new Date('2026-07-25T02:00:00Z') });
    expect(result).toEqual({ ok: false, reason: 'wrong_day' });
  });

  it('rejects an already-expired token', async () => {
    // Minted 20h in the past with a 14h TTL → exp is behind real now.
    const token = await mintCheckInToken({
      eventSlug: 'melbourne',
      dayIndex: 1,
      now: new Date(Date.now() - 20 * 60 * 60 * 1000),
    });
    const result = await verifyCheckInToken(token);
    expect(result.ok).toBe(false);
  });

  it('rejects a garbage / tampered token', async () => {
    expect(await verifyCheckInToken('not-a-jwt')).toEqual({ ok: false, reason: 'invalid' });
    const token = await mintCheckInToken({ eventSlug: 'melbourne', dayIndex: 1 });
    expect(await verifyCheckInToken(token + 'x')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a missing token', async () => {
    expect(await verifyCheckInToken(undefined)).toEqual({ ok: false, reason: 'invalid' });
    expect(await verifyCheckInToken(null)).toEqual({ ok: false, reason: 'invalid' });
  });
});
