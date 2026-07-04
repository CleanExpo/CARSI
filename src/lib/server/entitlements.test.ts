import { describe, expect, it } from 'vitest';

import {
  PAST_DUE_GRACE_DAYS,
  decideMembershipEntitlement,
} from './entitlements';

const NOW = new Date('2026-07-04T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('decideMembershipEntitlement', () => {
  it('entitles an active subscription (full catalogue)', () => {
    expect(
      decideMembershipEntitlement({ status: 'active', currentPeriodEnd: new Date(NOW.getTime() + 300 * DAY) }, NOW),
    ).toEqual({ entitled: true, reason: 'active' });
  });

  it('entitles a trialing subscription without inspecting the period end', () => {
    expect(
      decideMembershipEntitlement({ status: 'trialing', currentPeriodEnd: null }, NOW),
    ).toEqual({ entitled: true, reason: 'active' });
  });

  it('is case/whitespace insensitive on status', () => {
    expect(
      decideMembershipEntitlement({ status: '  Active ', currentPeriodEnd: null }, NOW),
    ).toEqual({ entitled: true, reason: 'active' });
  });

  it('entitles a past_due subscription INSIDE the grace window', () => {
    // Period ended 3 days ago; grace is 7 days → still entitled.
    const periodEnd = new Date(NOW.getTime() - 3 * DAY);
    expect(decideMembershipEntitlement({ status: 'past_due', currentPeriodEnd: periodEnd }, NOW)).toEqual({
      entitled: true,
      reason: 'grace',
    });
  });

  it('entitles a past_due subscription exactly AT the grace boundary', () => {
    const periodEnd = new Date(NOW.getTime() - PAST_DUE_GRACE_DAYS * DAY);
    expect(decideMembershipEntitlement({ status: 'past_due', currentPeriodEnd: periodEnd }, NOW)).toEqual({
      entitled: true,
      reason: 'grace',
    });
  });

  it('LAPSES a past_due subscription one second BEYOND the grace window', () => {
    const periodEnd = new Date(NOW.getTime() - PAST_DUE_GRACE_DAYS * DAY - 1000);
    expect(decideMembershipEntitlement({ status: 'past_due', currentPeriodEnd: periodEnd }, NOW)).toEqual({
      entitled: false,
      reason: 'lapsed',
    });
  });

  it('fails closed: past_due with no known period end is lapsed', () => {
    expect(decideMembershipEntitlement({ status: 'past_due', currentPeriodEnd: null }, NOW)).toEqual({
      entitled: false,
      reason: 'lapsed',
    });
  });

  it('lapses canceled / unpaid / incomplete_expired subscriptions', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired']) {
      expect(decideMembershipEntitlement({ status, currentPeriodEnd: null }, NOW)).toEqual({
        entitled: false,
        reason: 'lapsed',
      });
    }
  });

  it('returns "none" when there is no subscription at all', () => {
    expect(decideMembershipEntitlement(null, NOW)).toEqual({ entitled: false, reason: 'none' });
    expect(decideMembershipEntitlement({ status: null, currentPeriodEnd: null }, NOW)).toEqual({
      entitled: false,
      reason: 'none',
    });
  });

  it('FAILS CLOSED on an unrecognised status (never grants on unknown)', () => {
    expect(decideMembershipEntitlement({ status: 'some_new_stripe_state', currentPeriodEnd: null }, NOW)).toEqual({
      entitled: false,
      reason: 'unknown',
    });
  });

  it('FAILS CLOSED on the pre-payment "incomplete" status', () => {
    expect(decideMembershipEntitlement({ status: 'incomplete', currentPeriodEnd: null }, NOW)).toEqual({
      entitled: false,
      reason: 'unknown',
    });
  });

  it('fails closed on a NaN period end for past_due', () => {
    expect(
      decideMembershipEntitlement({ status: 'past_due', currentPeriodEnd: new Date('not-a-date') }, NOW),
    ).toEqual({ entitled: false, reason: 'lapsed' });
  });
});
