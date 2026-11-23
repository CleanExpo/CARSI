import { describe, expect, it } from 'vitest';

import { summariseOpsPeriod } from './admin-ops-metrics';

// GP-764: admin revenue is the amount Stripe actually charged per checkout, recorded at
// fulfilment. Older paid enrolments with no record stay "price at purchase unknown" and are
// never valued at a course's price today (GP-763).

const now = new Date('2026-11-23T02:00:00.000Z');
const NOV = new Date('2026-11-05T00:00:00.000Z');
const OCT = new Date('2026-10-05T00:00:00.000Z');

function sale(paymentReference: string, enrolledAt = NOV, status = 'active') {
  return { enrolledAt, completedAt: null, certificateIssuedAt: null, status, paymentReference };
}

function paid(
  id: string,
  cents: number | null,
  at = NOV,
  extra: { currency?: string | null; reversed?: boolean } = {}
) {
  return {
    checkoutSessionId: id,
    paidAt: at,
    amountTotalCents: cents,
    currency: extra.currency === undefined ? 'aud' : extra.currency,
    reversed: extra.reversed ?? false,
  };
}

type Kpis = ReturnType<typeof summariseOpsPeriod> & {
  revenueRecordedAud?: number;
  paidPriceUnknown?: number;
};
const kpis = (...args: Parameters<typeof summariseOpsPeriod>) =>
  summariseOpsPeriod(...args) as Kpis;

describe('admin revenue from recorded amounts (GP-764)', () => {
  it('every paid checkout recorded: real dollars, summed per checkout', () => {
    const k = kpis([sale('cs_a'), sale('cs_b'), sale('free')], [], 'this_month', now, [
      paid('cs_a', 29900),
      paid('cs_b', 4900),
    ]);
    expect(k.paidEnrollments).toBe(2);
    expect(k.revenueAud).toBe(348);
    expect(k.revenueRecordedAud).toBe(348);
    expect(k.paidPriceUnknown).toBe(0);
  });

  it('a team purchase counts its whole session amount once', () => {
    const k = kpis([sale('cs_team'), sale('team:t1'), sale('team:t1')], [], 'all', now, [
      paid('cs_team', 149500),
    ]);
    expect(k.revenueAud).toBe(1495);
  });

  it('a session paid while its buyer already held the course still counts (no paid enrolment for it)', () => {
    const k = kpis([sale('cs_old')], [], 'all', now, [
      paid('cs_old', 29900),
      paid('cs_seats', 89700),
    ]);
    expect(k.revenueAud).toBe(1196);
  });

  it('older paid enrolments with no record are counted as unknown beside the recorded dollars', () => {
    const k = kpis([sale('cs_new'), sale('cs_older_1'), sale('cs_older_2')], [], 'all', now, [
      paid('cs_new', 29900),
    ]);
    expect(k.revenueAud).toBeNull();
    expect(k.revenueRecordedAud).toBe(299);
    expect(k.paidPriceUnknown).toBe(2);
  });

  it('a refunded or disputed session is not revenue', () => {
    const k = kpis([sale('cs_kept'), sale('cs_refunded', NOV, 'revoked')], [], 'all', now, [
      paid('cs_kept', 29900),
      paid('cs_refunded', 29900, NOV, { reversed: true }),
    ]);
    expect(k.revenueAud).toBe(299);
    expect(k.paidPriceUnknown).toBe(0);
  });

  it('an unknown amount or a non-AUD amount is never summed as AUD', () => {
    const k = kpis([sale('cs_null'), sale('cs_usd')], [], 'all', now, [
      paid('cs_null', null),
      paid('cs_usd', 10000, NOV, { currency: 'usd' }),
    ]);
    expect(k.revenueAud).toBeNull();
    expect(k.revenueRecordedAud).toBe(0);
    expect(k.paidPriceUnknown).toBe(2);
  });

  it('each period counts the payments recorded inside it', () => {
    const sales = [sale('cs_nov'), sale('cs_oct', OCT)];
    const payments = [paid('cs_nov', 29900), paid('cs_oct', 4900, OCT)];
    expect(kpis(sales, [], 'this_month', now, payments).revenueAud).toBe(299);
    expect(kpis(sales, [], 'last_month', now, payments).revenueAud).toBe(49);
    expect(kpis(sales, [], 'all', now, payments).revenueAud).toBe(348);
  });

  it('control: with no records the GP-763 rule is unchanged (0 with no paid enrolments, else unknown)', () => {
    expect(kpis([sale('free')], [], 'all', now).revenueAud).toBe(0);
    expect(kpis([sale('cs_x')], [], 'all', now).revenueAud).toBeNull();
  });
});

describe('the revenue line (GP-764)', () => {
  it('shows the full figure, or recorded dollars beside the unknown count, never a partial sum alone', async () => {
    const { formatRevenueSummary } = await import('./admin-ops-format');
    expect(
      formatRevenueSummary({ revenueAud: 348, revenueRecordedAud: 348, paidPriceUnknown: 0 })
    ).toBe('$348');
    expect(
      formatRevenueSummary({ revenueAud: null, revenueRecordedAud: 299, paidPriceUnknown: 2 })
    ).toBe('$299 recorded, plus 2 paid checkouts with price at purchase unknown');
    expect(
      formatRevenueSummary({ revenueAud: null, revenueRecordedAud: 299, paidPriceUnknown: 1 })
    ).toContain('1 paid checkout with');
    expect(
      formatRevenueSummary({ revenueAud: null, revenueRecordedAud: 0, paidPriceUnknown: 3 })
    ).toBe('Price at purchase unknown');
  });
});
