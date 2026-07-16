import {
  CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD,
  CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS,
  CCW_ATTENDEE_OFFER_QUERY,
  CCW_OFFER_SOCIAL_LINKS,
  CCW_SHOPIFY_TRAINING_URL,
} from '@/lib/marketing/ccw-roadshow-offer-pack';
import { describe, expect, it } from 'vitest';

describe('ccw-roadshow-offer-pack constants', () => {
  it('locks the $295 attendee price and offer query in code (no env)', () => {
    expect(CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD).toBe(295);
    expect(CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS).toBe(29500);
    expect(CCW_ATTENDEE_OFFER_QUERY).toBe('ccw-attendee');
  });

  it('hardcodes the Shopify preview training product URL', () => {
    expect(CCW_SHOPIFY_TRAINING_URL).toBe(
      'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training',
    );
  });

  it('includes CCW social links', () => {
    expect(CCW_OFFER_SOCIAL_LINKS.map((l) => l.href)).toEqual(
      expect.arrayContaining([
        'https://x.com/ccwonline',
        'https://www.facebook.com/CarpetCleanersWarehouse',
        'https://www.linkedin.com/company/carpet-cleaners-warehouse/',
        'https://ccwonline.com.au/',
      ]),
    );
  });
});
