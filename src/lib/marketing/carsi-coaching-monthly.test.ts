import { describe, expect, it } from 'vitest';

import {
    carsiCoachingMonthlyPriceCents,
    carsiCoachingMonthlyPriceLabel,
    formatCoachingAudFromCents,
} from './carsi-coaching-monthly';

describe('CARSI Business Coaching monthly', () => {
  it('is $495 AUD per month', () => {
    expect(carsiCoachingMonthlyPriceCents).toBe(49_500);
    expect(formatCoachingAudFromCents(carsiCoachingMonthlyPriceCents)).toBe('$495');
    expect(carsiCoachingMonthlyPriceLabel).toBe('$495/month');
  });
});
