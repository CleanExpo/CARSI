/**
 * CCW attendee membership offer — pure checkout-param builder (slice-3, §10.6).
 *
 * Assembles the Stripe params for a verified attendee to start the `pro_annual`
 * membership at the attendee rate (Stripe coupon `duration: once` → $295 first
 * year, then $795/yr). PURE — no Stripe call, no auth; the attendee-gated route
 * (later slice) verifies the attendee, resolves userId/priceId/couponId, calls
 * this, then `createCheckoutSession`. Spec:
 * docs/specs/ccw-attendee-offers-day-gated-2026-07-15.md §10
 */
import type { CheckoutSessionParams } from '@/lib/api/stripe';

export function buildMembershipCheckoutParams(input: {
  /** The AUTHENTICATED attendee's CARSI user id — binds the subscription (AC-8). */
  userId: string;
  /** The recurring `pro_annual` Stripe price id. */
  priceId: string;
  /** Optional server-side coupon id; omitted ⇒ full price. */
  couponId?: string;
  successUrl: string;
  cancelUrl: string;
  /** Existing Stripe customer, if the attendee already has one. */
  customer?: string;
}): CheckoutSessionParams {
  return {
    ...(input.customer ? { customer: input.customer } : {}),
    line_items: [{ price: input.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    // subscription-store maps the Stripe subscription back to this learner.
    metadata: { carsi_user_id: input.userId },
    ...(input.couponId ? { discounts: [{ coupon: input.couponId }] } : {}),
  };
}
