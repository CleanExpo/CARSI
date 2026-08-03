import { describe, expect, it } from 'vitest';

import {
  areAttendeeOffersActive,
  ccwRoadshowAttendeeOffers,
  isDistributableOfferUrl,
  selectActiveOffers,
  selectActiveOffersForNow,
  type CcwAttendeeOffer,
} from './ccw-roadshow-offers';

// Melbourne window: Wed 22 – Thu 23 Jul 2026, 08:30–16:30 AEST (+10:00).
const melb = {
  startDateIso: '2026-07-22T08:30:00+10:00',
  endDateIso: '2026-07-23T16:30:00+10:00',
};

// A future summer event to prove DST (+11:00 AEDT) is handled by comparing instants.
const summer = {
  startDateIso: '2026-12-02T08:30:00+11:00',
  endDateIso: '2026-12-03T16:30:00+11:00',
};

function liveOffer(overrides: Partial<CcwAttendeeOffer> = {}): CcwAttendeeOffer {
  return {
    key: 'ccw-store-credit',
    label: 'CCW store credit',
    detail: 'Claim on the day',
    url: 'https://ccw-store.myshopify.com/products/x',
    live: true,
    ...overrides,
  };
}

describe('areAttendeeOffersActive', () => {
  it('is false the day before the event', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-21T12:00:00+10:00'))).toBe(false);
  });

  it('is true on day 1 during hours', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-22T10:00:00+10:00'))).toBe(true);
  });

  it('is true exactly at the start instant (inclusive)', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-22T08:30:00+10:00'))).toBe(true);
  });

  it('is true on day 2 during hours', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-23T14:00:00+10:00'))).toBe(true);
  });

  it('is true exactly at the end instant (inclusive)', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-23T16:30:00+10:00'))).toBe(true);
  });

  it('is false after the event ends', () => {
    expect(areAttendeeOffersActive(melb, new Date('2026-07-23T17:00:00+10:00'))).toBe(false);
  });

  it('handles a future DST (+11:00) event by comparing instants', () => {
    expect(areAttendeeOffersActive(summer, new Date('2026-12-02T10:00:00+11:00'))).toBe(true);
    expect(areAttendeeOffersActive(summer, new Date('2026-12-01T10:00:00+11:00'))).toBe(false);
  });
});

describe('isDistributableOfferUrl', () => {
  it('accepts a permanent https product URL', () => {
    expect(isDistributableOfferUrl('https://ccw-store.myshopify.com/products/x')).toBe(true);
  });

  it('rejects a Shopify preview URL (temporary host)', () => {
    expect(
      isDistributableOfferUrl(
        'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training',
      ),
    ).toBe(false);
  });

  it('rejects the bare shopifypreview.com host', () => {
    expect(isDistributableOfferUrl('https://shopifypreview.com/x')).toBe(false);
  });

  it('matches the preview host by suffix, not substring (path spoof is fine)', () => {
    // "shopifypreview.com" only in the PATH → real domain → distributable
    expect(isDistributableOfferUrl('https://ccw.com/shopifypreview.com')).toBe(true);
    // real preview subdomain → rejected
    expect(isDistributableOfferUrl('https://x.shopifypreview.com/y')).toBe(false);
  });

  it('rejects non-https', () => {
    expect(isDistributableOfferUrl('http://ccw-store.myshopify.com/x')).toBe(false);
  });

  it('rejects an unparseable / empty URL', () => {
    expect(isDistributableOfferUrl('not-a-url')).toBe(false);
    expect(isDistributableOfferUrl('')).toBe(false);
  });
});

describe('selectActiveOffers', () => {
  const during = new Date('2026-07-22T10:00:00+10:00');
  const before = new Date('2026-07-21T10:00:00+10:00');

  it('returns nothing when the feature is disabled, even during the window', () => {
    expect(selectActiveOffers(melb, during, { enabled: false, offers: [liveOffer()] })).toEqual([]);
  });

  it('returns nothing outside the event window', () => {
    expect(selectActiveOffers(melb, before, { enabled: true, offers: [liveOffer()] })).toEqual([]);
  });

  it('includes a live offer with a distributable URL during the window', () => {
    const result = selectActiveOffers(melb, during, { enabled: true, offers: [liveOffer()] });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('ccw-store-credit');
  });

  it('excludes a live offer whose URL is a preview URL (fail-closed)', () => {
    const preview = liveOffer({ url: 'https://abc.shopifypreview.com/products/x' });
    expect(selectActiveOffers(melb, during, { enabled: true, offers: [preview] })).toEqual([]);
  });

  it('excludes an offer that is not live', () => {
    const notLive = liveOffer({ live: false });
    expect(selectActiveOffers(melb, during, { enabled: true, offers: [notLive] })).toEqual([]);
  });

  it('includes a live URL-less membership offer (grant path, no URL to validate)', () => {
    const membership = liveOffer({
      key: 'carsi-membership',
      url: undefined,
      membershipPriceAud: 295,
    });
    const result = selectActiveOffers(melb, during, { enabled: true, offers: [membership] });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('carsi-membership');
  });

  it('by default surfaces only the live CCW offer during the window', () => {
    const result = selectActiveOffers(melb, during, { enabled: true });
    expect(result.map((o) => o.key)).toEqual(['ccw-store-credit']);
  });
});

describe('ccwRoadshowAttendeeOffers (shipped config)', () => {
  it('defines the three offers; CCW is live, membership + RA still dark pending deps', () => {
    const byKey = Object.fromEntries(ccwRoadshowAttendeeOffers.map((o) => [o.key, o]));
    expect(Object.keys(byKey).sort()).toEqual([
      'carsi-membership',
      'ccw-store-credit',
      'ra-setup',
    ]);
    expect(byKey['ccw-store-credit'].live).toBe(true);
    expect(byKey['ccw-store-credit'].url).toBe(
      'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
    );
    expect(byKey['carsi-membership'].live).toBe(false);
    expect(byKey['ra-setup'].live).toBe(false);
  });

  it('carries no baked-in preview URLs', () => {
    for (const offer of ccwRoadshowAttendeeOffers) {
      if (offer.url) expect(isDistributableOfferUrl(offer.url)).toBe(true);
    }
  });
});

describe('selectActiveOffersForNow', () => {
  it('surfaces the live CCW offer during a real roadshow event (Melbourne day 1)', () => {
    const now = new Date('2026-07-22T10:00:00+10:00');
    const result = selectActiveOffersForNow(now, { enabled: true });
    expect(result.map((o) => o.key)).toEqual(['ccw-store-credit']);
  });

  it('surfaces nothing when no roadshow event is running', () => {
    const now = new Date('2026-07-10T10:00:00+10:00'); // before all events
    expect(selectActiveOffersForNow(now, { enabled: true })).toEqual([]);
  });

  it('surfaces nothing when the feature is disabled, even mid-event', () => {
    const now = new Date('2026-07-22T10:00:00+10:00');
    expect(selectActiveOffersForNow(now, { enabled: false })).toEqual([]);
  });
});
