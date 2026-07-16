/**
 * Post-event offer pack for CCW/CARSI Business Growth Day attendees.
 * All amounts and links are hardcoded — no env vars required for this feature.
 */

/** Shopify product for the 2-day in-house training (preview URL). */
export const CCW_SHOPIFY_TRAINING_URL =
  'https://h8qtw8uoiufz9z7c-21796391.shopifypreview.com/products/ccw-carsi-2-day-in-house-training';

/** Attendee-only yearly membership — first year A$295 via Stripe Checkout price_data. */
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_AUD = 295;
export const CCW_ATTENDEE_MEMBERSHIP_PRICE_CENTS = 29500;
export const CCW_ATTENDEE_MEMBERSHIP_LABEL = '$295 / year (course-attendee special)';
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
