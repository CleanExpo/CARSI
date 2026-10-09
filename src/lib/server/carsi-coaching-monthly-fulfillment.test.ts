import { describe, expect, it } from 'vitest';

import { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } from '@/lib/server/carsi-coaching-monthly-checkout';
import { isCarsiCoachingMonthlyCheckoutSession } from '@/lib/server/carsi-coaching-monthly-fulfillment';

describe('CARSI coaching monthly fulfillment', () => {
  it('recognises coaching checkout sessions by metadata source', () => {
    expect(
      isCarsiCoachingMonthlyCheckoutSession({
        metadata: { source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE },
      } as import('stripe').Stripe.Checkout.Session)
    ).toBe(true);
    expect(
      isCarsiCoachingMonthlyCheckoutSession({
        metadata: { source: 'other' },
      } as import('stripe').Stripe.Checkout.Session)
    ).toBe(false);
  });
});
