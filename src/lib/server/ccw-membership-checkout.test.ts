import { describe, expect, it } from 'vitest';

import { buildMembershipCheckoutParams } from './ccw-membership-checkout';

const base = {
  userId: 'user-123',
  priceId: 'price_pro_annual',
  successUrl: 'https://carsi.com.au/ccw/membership/success',
  cancelUrl: 'https://carsi.com.au/ccw/membership/cancel',
};

describe('buildMembershipCheckoutParams', () => {
  it('builds a subscription checkout for the annual price (qty 1)', () => {
    const p = buildMembershipCheckoutParams(base);
    expect(p.mode).toBe('subscription');
    expect(p.line_items).toEqual([{ price: 'price_pro_annual', quantity: 1 }]);
    expect(p.success_url).toBe(base.successUrl);
    expect(p.cancel_url).toBe(base.cancelUrl);
  });

  it('binds to the authenticated attendee via carsi_user_id metadata (AC-8 / AC-4)', () => {
    const p = buildMembershipCheckoutParams(base);
    expect(p.metadata).toEqual({ carsi_user_id: 'user-123' });
  });

  it('applies the coupon server-side as discounts when a couponId is given', () => {
    const p = buildMembershipCheckoutParams({ ...base, couponId: 'coupon_ccw_295' });
    expect(p.discounts).toEqual([{ coupon: 'coupon_ccw_295' }]);
  });

  it('omits discounts entirely when no couponId is given (full price)', () => {
    const p = buildMembershipCheckoutParams(base);
    expect('discounts' in p).toBe(false);
  });

  it('NEVER enables allow_promotion_codes (AC-10 — no public discount code)', () => {
    const withCoupon = buildMembershipCheckoutParams({ ...base, couponId: 'coupon_ccw_295' });
    const without = buildMembershipCheckoutParams(base);
    expect('allow_promotion_codes' in withCoupon).toBe(false);
    expect('allow_promotion_codes' in without).toBe(false);
  });

  it('passes an existing Stripe customer through when supplied', () => {
    const p = buildMembershipCheckoutParams({ ...base, customer: 'cus_abc' });
    expect(p.customer).toBe('cus_abc');
  });

  it('omits customer when not supplied', () => {
    const p = buildMembershipCheckoutParams(base);
    expect('customer' in p).toBe(false);
  });
});
