/**
 * Post-event offer pack for CCW/CARSI Business Growth Day attendees.
 * Client-safe constants (links + labels) — no server secrets.
 *
 * Decisions locked for Jul 2026 roadshow:
 * - Delivery = post-event email after both days + email opt-in + provisioned
 * - Shopify = preview product URL until live ccwonline handle replaces it via env
 * - Membership = A$295/yr first year via Stripe (dedicated Price or coupon)
 * - RestoreAssist = out of scope
 */

/** Default Shopify product (preview). Override with NEXT_PUBLIC_CCW_SHOPIFY_TRAINING_URL when live. */
export const CCW_SHOPIFY_TRAINING_URL_DEFAULT =
  'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training';

export function getCcwShopifyTrainingUrl(): string {
  const override =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CCW_SHOPIFY_TRAINING_URL?.trim()
      : undefined;
  return override || CCW_SHOPIFY_TRAINING_URL_DEFAULT;
}

/** @deprecated Prefer getCcwShopifyTrainingUrl() — kept for client imports that need a const. */
export const CCW_SHOPIFY_TRAINING_URL = CCW_SHOPIFY_TRAINING_URL_DEFAULT;

/** Attendee-only yearly membership — first year A$295 via Stripe. */
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD = 295;
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS = 29500;
export const CCW_ATTENDEE_MEMBERSHIP_LABEL = '$295 / year (course-attendee special)';

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
