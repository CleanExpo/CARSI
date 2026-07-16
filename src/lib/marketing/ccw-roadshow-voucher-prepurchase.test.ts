import { describe, it, expect } from 'vitest';

import {
  isVoucherPurchaseWindowOpen,
  selectPrepurchaseVoucher,
  type CcwAttendeeOffer,
} from './ccw-roadshow-offers';

// Melbourne: day 1 starts 22 Jul 08:30 AEST (+10:00).
const event = {
  startDateIso: '2026-07-22T08:30:00+10:00',
  endDateIso: '2026-07-23T16:30:00+10:00',
};

const liveVoucher: CcwAttendeeOffer = {
  key: 'ccw-store-credit',
  label: 'CCW attendee voucher',
  detail: 'Purchase your CCW/CARSI 2-day training voucher.',
  url: 'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
  live: true,
};

describe('isVoucherPurchaseWindowOpen', () => {
  it('is open well before the event (today)', () => {
    expect(isVoucherPurchaseWindowOpen(event, new Date('2026-07-16T09:00:00+10:00'))).toBe(true);
  });

  it('is open on the morning of day 1', () => {
    expect(isVoucherPurchaseWindowOpen(event, new Date('2026-07-22T09:00:00+10:00'))).toBe(true);
  });

  it('is open through the whole of day 1 (up to 24h after start)', () => {
    expect(isVoucherPurchaseWindowOpen(event, new Date('2026-07-22T23:59:00+10:00'))).toBe(true);
  });

  it('is closed once the first day has fully passed (day 2)', () => {
    expect(isVoucherPurchaseWindowOpen(event, new Date('2026-07-23T10:00:00+10:00'))).toBe(false);
  });

  it('returns false on a malformed date', () => {
    expect(isVoucherPurchaseWindowOpen({ startDateIso: 'nope', endDateIso: 'nope' }, new Date())).toBe(false);
  });
});

describe('selectPrepurchaseVoucher', () => {
  const now = new Date('2026-07-16T09:00:00+10:00'); // window open

  it('returns null when the flag is off', () => {
    expect(selectPrepurchaseVoucher(event, now, { enabled: false, offers: [liveVoucher] })).toBeNull();
  });

  it('returns the voucher when flag on + window open + live + valid url', () => {
    const v = selectPrepurchaseVoucher(event, now, { enabled: true, offers: [liveVoucher] });
    expect(v?.key).toBe('ccw-store-credit');
    expect(v?.url).toContain('ccwonline.com.au');
  });

  it('returns null when the offer is not live', () => {
    const dark = [{ ...liveVoucher, live: false }];
    expect(selectPrepurchaseVoucher(event, now, { enabled: true, offers: dark })).toBeNull();
  });

  it('returns null for a shopify preview url (fail-closed)', () => {
    const preview = [{ ...liveVoucher, url: 'https://x.shopifypreview.com/products/foo' }];
    expect(selectPrepurchaseVoucher(event, now, { enabled: true, offers: preview })).toBeNull();
  });

  it('returns null once the purchase window has closed', () => {
    const afterDay1 = new Date('2026-07-23T10:00:00+10:00');
    expect(selectPrepurchaseVoucher(event, afterDay1, { enabled: true, offers: [liveVoucher] })).toBeNull();
  });
});
