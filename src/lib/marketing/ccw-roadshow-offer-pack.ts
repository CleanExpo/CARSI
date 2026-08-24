/**
 * Post-event offer pack for CCW/CARSI Business Growth Day attendees.
 * All amounts are hardcoded — no env vars required for this feature. The one
 * outbound link is resolved from the roadshow offer config and guarded; see
 * `resolveCcwShopifyTrainingUrl`.
 */
import {
  ccwRoadshowAttendeeOffers,
  isDistributableOfferUrl,
  type CcwAttendeeOffer,
} from './ccw-roadshow-offers';

/**
 * The CCW 2-day training product link for the post-event offer pack, or `null`
 * when there is nothing safe to send.
 *
 * This used to be a second hardcoded literal, and it held a
 * `*.shopifypreview.com` URL — a temporary Shopify preview link that was being
 * emailed to attendees while the verified permanent URL already sat in
 * `ccw-roadshow-offers.ts`. Preview links expire, so every one of those emails
 * was a dead CTA waiting to happen. Two separate failures made that possible and
 * both are closed here:
 *
 *  - **Two sources of truth.** The offer's URL now comes from
 *    `ccwRoadshowAttendeeOffers` — the same row the rest of the roadshow reads —
 *    so the two cannot drift apart again.
 *  - **The guard was never applied on this path.** `isDistributableOfferUrl`
 *    existed (spec §4.5, fail-closed on preview hosts) but nothing called it
 *    before the offer-pack email. It is now the gate: an offer that is not
 *    `live`, has no URL, or carries a preview host resolves to `null` and the
 *    email goes out WITHOUT the Shopify CTA rather than with a link that breaks.
 */
export function resolveCcwShopifyTrainingUrl(
  offers: readonly CcwAttendeeOffer[] = ccwRoadshowAttendeeOffers,
): string | null {
  const offer = offers.find((o) => o.key === 'ccw-store-credit');
  if (!offer?.live) return null;
  if (typeof offer.url !== 'string' || !isDistributableOfferUrl(offer.url)) return null;
  return offer.url;
}

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
