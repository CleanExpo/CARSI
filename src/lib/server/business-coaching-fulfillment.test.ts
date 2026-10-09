import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import { BUSINESS_COACHING_CHECKOUT_SOURCE } from '@/lib/server/business-coaching-checkout';
import { isBusinessCoachingCheckoutSession } from '@/lib/server/business-coaching-fulfillment';

function session(meta: Record<string, string>): Stripe.Checkout.Session {
  return { id: 'cs_test', metadata: meta } as Stripe.Checkout.Session;
}

describe('isBusinessCoachingCheckoutSession', () => {
  it('matches Owner Circle Stripe metadata', () => {
    expect(
      isBusinessCoachingCheckoutSession(
        session({
          source: BUSINESS_COACHING_CHECKOUT_SOURCE,
          session_slug: '2026-11',
          package_id: 'owner',
        }),
      ),
    ).toBe(true);
  });

  it('ignores course and roadshow checkouts', () => {
    expect(isBusinessCoachingCheckoutSession(session({ source: 'carsi-ccw-roadshow' }))).toBe(false);
    expect(isBusinessCoachingCheckoutSession(session({ course_slug: 'intro' }))).toBe(false);
    expect(isBusinessCoachingCheckoutSession(session({}))).toBe(false);
  });
});
