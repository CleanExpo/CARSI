/**
 * Referral partners (GP-767). A partner link is any CARSI page address with `?ref=<partner id>`,
 * for example https://carsi.com.au/courses/<slug>?ref=ccw. The request proxy records the partner
 * in the first-party `carsi_ref` cookie for 30 days, the course checkout copies it into the Stripe
 * Checkout Session metadata, and the Stripe webhook stores a partner sale row for settlement.
 *
 * This list is the allow-list: a ref, cookie or metadata value not named here is ignored.
 * Commission terms are not set (founder decision), so nothing here calculates a payout.
 */

export const REFERRAL_PARTNERS = {
  ccw: { id: 'ccw', name: 'Carpet Cleaners Warehouse' },
} as const;

export type ReferralPartnerId = keyof typeof REFERRAL_PARTNERS;

/** Query parameter on a partner link. */
export const PARTNER_REF_QUERY_PARAM = 'ref';
/** First-party cookie holding the partner id. */
export const PARTNER_REF_COOKIE_NAME = 'carsi_ref';
/** 30 days. A repeat visit on a partner link restarts the 30 days; the latest partner wins. */
export const PARTNER_REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Stripe Checkout Session metadata key. */
export const PARTNER_REF_METADATA_KEY = 'referral_partner';

/** The partner id for a known partner (any letter case), otherwise null. */
export function parseReferralPartnerId(value: unknown): ReferralPartnerId | null {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(REFERRAL_PARTNERS, id) ? (id as ReferralPartnerId) : null;
}
