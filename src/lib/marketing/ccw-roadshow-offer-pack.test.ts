import {
  CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD,
  CCW_ATTENDEE_OFFER_QUERY,
  CCW_OFFER_SOCIAL_LINKS,
  CCW_SHOPIFY_TRAINING_URL_DEFAULT,
  getCcwShopifyTrainingUrl,
} from '@/lib/marketing/ccw-roadshow-offer-pack';
import { describe, expect, it } from 'vitest';

describe('ccw-roadshow-offer-pack constants', () => {
  it('locks the $295 attendee price and offer query', () => {
    expect(CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD).toBe(295);
    expect(CCW_ATTENDEE_OFFER_QUERY).toBe('ccw-attendee');
  });

  it('defaults to the Shopify preview training product', () => {
    expect(CCW_SHOPIFY_TRAINING_URL_DEFAULT).toContain('ccw-carsi-2-day-in-house-training');
    expect(getCcwShopifyTrainingUrl()).toContain('ccw-carsi-2-day-in-house-training');
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
