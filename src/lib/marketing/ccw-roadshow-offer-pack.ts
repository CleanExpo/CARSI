/**
 * Post-event offer pack for CCW/CARSI Business Growth Day attendees.
 * All amounts and links are hardcoded — no env vars required for this feature.
 */

/** Shopify product for the 2-day in-house training (preview URL). */
export const CCW_SHOPIFY_TRAINING_URL =
  'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training';

/**
 * Attendee-only membership rate: A$295 for the FIRST YEAR, then the standing
 * A$795/yr (founder, 2026-08-24 — A$795/yr is the standing price, not a
 * first-year one).
 *
 * The first year is discounted by a Stripe coupon on the ordinary `pro_annual`
 * price, NOT by a cheaper recurring price — see the attendee branch of
 * `app/api/lms/subscription/checkout/route.ts`. These figures therefore describe
 * what the coupon must do: `CCW_MEMBERSHIP_COUPON_ID` must be `duration: once`
 * with `amount_off` of A$500 (50000 cents) so the first invoice lands on A$295.
 * Nothing in this repo can verify Rana's Stripe coupon config — if that coupon
 * is ever changed, THIS LABEL BECOMES A FALSE PRICE CLAIM to attendees, so the
 * two must be changed together.
 */
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD = 295;
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS = 29500;
export const CCW_ATTENDEE_MEMBERSHIP_LABEL = '$295 first year, then $795 / year';
export const CCW_ATTENDEE_MEMBERSHIP_PRODUCT_NAME =
  'CARSI Yearly Membership — CCW/CARSI training-day special';

export const CCW_OFFER_SOCIAL_LINKS = [
  { label: 'CCW on X', href: 'https://x.com/ccwonline' },
  { label: 'CCW on Facebook', href: 'https://www.facebook.com/CarpetCleanersWarehouse' },
  {
    label: 'CCW on LinkedIn',
    href: 'https://www.linkedin.com/company/carpet-cleaners-warehouse/',
  },
  { label: 'Carpet Cleaners Warehouse', href: 'https://ccwonline.com.au/' },
] as const;

/** Query flag on /subscribe for the attendee Stripe checkout path. */
export const CCW_ATTENDEE_OFFER_QUERY = 'ccw-attendee';
