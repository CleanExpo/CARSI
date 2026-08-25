import {
  CCW_OFFER_SOCIAL_LINKS,
  resolveCcwShopifyTrainingUrl,
} from '@/lib/marketing/ccw-roadshow-offer-pack';
import type { CcwAttendeeOffer } from '@/lib/marketing/ccw-roadshow-offers';
import { describe, expect, it } from 'vitest';

describe('ccw-roadshow-offer-pack constants', () => {
  it('resolves the permanent CCW product URL from the offer config', () => {
    // The shipped config — proves the SSOT wiring, not just the helper.
    expect(resolveCcwShopifyTrainingUrl()).toBe(
      'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training'
    );
  });

  it('never resolves a Shopify preview URL, however the offer is configured', () => {
    // The exact link that was being emailed to attendees before this fix.
    const offers: CcwAttendeeOffer[] = [
      {
        key: 'ccw-store-credit',
        label: 'CCW attendee voucher',
        detail: 'x',
        url: 'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training',
        live: true,
      },
    ];
    expect(resolveCcwShopifyTrainingUrl(offers)).toBeNull();
  });

  it('resolves null rather than a link when the offer is not live or has no URL', () => {
    const base = { key: 'ccw-store-credit', label: 'x', detail: 'x' } as const;
    expect(
      resolveCcwShopifyTrainingUrl([
        { ...base, url: 'https://ccwonline.com.au/products/x', live: false },
      ])
    ).toBeNull();
    expect(resolveCcwShopifyTrainingUrl([{ ...base, live: true }])).toBeNull();
    expect(resolveCcwShopifyTrainingUrl([])).toBeNull();
  });

  it('rejects a plain-http product URL', () => {
    expect(
      resolveCcwShopifyTrainingUrl([
        {
          key: 'ccw-store-credit',
          label: 'x',
          detail: 'x',
          url: 'http://ccwonline.com.au/products/x',
          live: true,
        },
      ])
    ).toBeNull();
  });

  it('includes CCW social links', () => {
    expect(CCW_OFFER_SOCIAL_LINKS.map((l) => l.href)).toEqual(
      expect.arrayContaining([
        'https://x.com/ccwonline',
        'https://www.facebook.com/CarpetCleanersWarehouse',
        'https://www.linkedin.com/company/carpet-cleaners-warehouse/',
        'https://ccwonline.com.au/',
      ])
    );
  });
});
