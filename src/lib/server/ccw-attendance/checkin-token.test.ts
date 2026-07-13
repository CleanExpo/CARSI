import { describe, expect, it } from 'vitest';

import {
  eventDayStamp,
  mintCheckInToken,
  verifyCheckInToken,
} from './checkin-token';

/**
 * AC#15(h) — the event check-in token verifies signature/aud/purpose/exp AND
 * that the embedded event-local dateStamp is still today. A wrong day, an
 * expired token, or a garbage token are all rejected.
 */
describe('verifyCheckInToken', () => {
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
    const token = await mintCheckInToken({ eventSlug: 'melbourne', dayIndex: 1, dateStamp: '2026-07-22' });
    // A later calendar day in Australia/Sydney; token not yet expired.
    const result = await verifyCheckInToken(token, { now: new Date('2026-07-25T02:00:00Z') });
    expect(result).toEqual({ ok: false, reason: 'wrong_day' });
  });

  it('rejects an already-expired token', async () => {
    // Minted 20h in the past with a 14h TTL → exp is behind real now.
    const token = await mintCheckInToken(
      { eventSlug: 'melbourne', dayIndex: 1, now: new Date(Date.now() - 20 * 60 * 60 * 1000) },
    );
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
