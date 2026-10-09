import { describe, expect, it } from 'vitest';

import {
  carsiCoachingAddOns,
  carsiCoachingMonthlyInclusions,
  carsiCoachingPortalFeatures,
} from './carsi-coaching-program';
import { carsiCoachingMonthlyPriceLabel } from './carsi-coaching-monthly';

describe('CARSI coaching program content', () => {
  it('documents core inclusions and priced add-ons', () => {
    expect(carsiCoachingMonthlyInclusions.length).toBeGreaterThanOrEqual(4);
    const itemCount = carsiCoachingMonthlyInclusions.reduce((n, b) => n + b.items.length, 0);
    expect(itemCount).toBeGreaterThanOrEqual(10);
    expect(carsiCoachingAddOns.some((a) => a.includedInBase && a.priceLabel === carsiCoachingMonthlyPriceLabel)).toBe(
      true
    );
    expect(carsiCoachingAddOns.filter((a) => !a.includedInBase).length).toBeGreaterThanOrEqual(4);
  });

  it('lists portal features for subscribers', () => {
    expect(carsiCoachingPortalFeatures.length).toBeGreaterThanOrEqual(5);
  });
});
