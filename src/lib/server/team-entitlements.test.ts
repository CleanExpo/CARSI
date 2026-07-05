import { describe, expect, it } from 'vitest';

import {
  decideTeamSeatSubscription,
  isSeatEntitled,
  PAST_DUE_GRACE_DAYS,
} from './entitlements';

const NOW = new Date('2026-07-05T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('decideTeamSeatSubscription (WS1-E2, GP-442)', () => {
  it('reports the subscription live for an active seat subscription', () => {
    const d = decideTeamSeatSubscription(
      { status: 'active', currentPeriodEnd: new Date(NOW.getTime() + 300 * DAY), seatLimit: 5 },
      NOW,
    );
    expect(d).toEqual({ subscriptionEntitled: true, reason: 'active', seatLimit: 5 });
  });

  it('honours the 7-day grace window (same machine as the individual membership)', () => {
    const periodEnd = new Date(NOW.getTime() - 3 * DAY);
    const d = decideTeamSeatSubscription(
      { status: 'past_due', currentPeriodEnd: periodEnd, seatLimit: 15 },
      NOW,
    );
    expect(d).toEqual({ subscriptionEntitled: true, reason: 'grace', seatLimit: 15 });
  });

  it('lapses past_due beyond grace', () => {
    const periodEnd = new Date(NOW.getTime() - PAST_DUE_GRACE_DAYS * DAY - 1000);
    const d = decideTeamSeatSubscription(
      { status: 'past_due', currentPeriodEnd: periodEnd, seatLimit: 5 },
      NOW,
    );
    expect(d.subscriptionEntitled).toBe(false);
    expect(d.reason).toBe('lapsed');
  });

  it('fails closed on null input and on a zero/negative seat limit', () => {
    expect(decideTeamSeatSubscription(null, NOW)).toEqual({
      subscriptionEntitled: false,
      reason: 'none',
      seatLimit: 0,
    });
    const d = decideTeamSeatSubscription(
      { status: 'active', currentPeriodEnd: null, seatLimit: 0 },
      NOW,
    );
    expect(d.seatLimit).toBe(0);
  });

  it('fails closed on canceled (refund/dispute revocation writes canceled)', () => {
    const d = decideTeamSeatSubscription(
      { status: 'canceled', currentPeriodEnd: new Date('2099-01-01'), seatLimit: 5 },
      NOW,
    );
    expect(d.subscriptionEntitled).toBe(false);
  });
});

describe('isSeatEntitled — spec §15 #4 (exactly seatLimit members entitled)', () => {
  const liveFiveSeats = decideTeamSeatSubscription(
    { status: 'active', currentPeriodEnd: new Date(NOW.getTime() + 300 * DAY), seatLimit: 5 },
    NOW,
  );

  it('entitles seats 0..4 on a 5-seat plan', () => {
    for (let i = 0; i < 5; i++) {
      expect(isSeatEntitled(liveFiveSeats, i)).toEqual({ entitled: true, reason: 'active' });
    }
  });

  it('REJECTS the 6th member (seat index 5) as seat_full — the seat-expansion trigger', () => {
    expect(isSeatEntitled(liveFiveSeats, 5)).toEqual({ entitled: false, reason: 'seat_full' });
  });

  it('rejects a member not on the team (index -1) as seat_full', () => {
    expect(isSeatEntitled(liveFiveSeats, -1)).toEqual({ entitled: false, reason: 'seat_full' });
  });

  it('rejects every seat when the subscription is not live (lapsed), preserving the lapse reason', () => {
    const lapsed = decideTeamSeatSubscription(
      { status: 'canceled', currentPeriodEnd: null, seatLimit: 5 },
      NOW,
    );
    expect(isSeatEntitled(lapsed, 0)).toEqual({ entitled: false, reason: 'lapsed' });
    expect(isSeatEntitled(lapsed, 4)).toEqual({ entitled: false, reason: 'lapsed' });
  });

  it('fails closed on a non-integer seat index', () => {
    expect(isSeatEntitled(liveFiveSeats, 2.5).entitled).toBe(false);
    expect(isSeatEntitled(liveFiveSeats, Number.NaN).entitled).toBe(false);
  });
});
