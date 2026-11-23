/**
 * The ONE source of truth for CARSI membership prices (GP-773).
 *
 * Founder prices of 20/10/2026, ruled again by pop-up on 22/11/2026:
 *  - Individual annual membership: A$795 per year.
 *  - Business owner plan (the organisation plan, with the owner's staff-tracking dashboard):
 *    A$1,295 per year.
 *  - Each extra staff member: A$695 per year, with their own login.
 *  - No further discounts: membership checkouts do not accept promotion codes.
 *
 * All prices are GST-inclusive (founder GST ruling, 22/11/2026).
 *
 * Every page, label and checkout reads these values. Server-side, the checkout routes only
 * accept a Stripe Price whose amount, currency and interval match the entry here (see
 * `src/lib/server/membership-price-check.ts`), so a page can never quote one price while
 * Stripe bills another. `membership-prices.test.ts` fails on a membership amount written
 * anywhere else in `app/` or `src/`.
 *
 * This file is imported by client components: keep it free of server-only imports.
 */

export type MembershipInterval = 'year';

export interface MembershipPrice {
  /** Price in cents, GST included. */
  amountCents: number;
  currency: 'aud';
  interval: MembershipInterval;
  /** Env var holding an explicit Stripe Price id (optional; lookup key is the fallback). */
  envVar: string | null;
  /** Stripe Price lookup_key the operator sets on the Price. */
  lookupKey: string | null;
}

export const INDIVIDUAL_MEMBERSHIP: MembershipPrice = {
  amountCents: 79_500,
  currency: 'aud',
  interval: 'year',
  envVar: 'STRIPE_PRICE_PRO_ANNUAL',
  lookupKey: 'carsi_pro_annual',
};

/**
 * Business owner plan. In code this is the organisation subscription (stored plan id
 * `org_monthly`, kept as-is so existing rows and webhooks are untouched).
 */
export const BUSINESS_OWNER_PLAN: MembershipPrice = {
  amountCents: 129_500,
  currency: 'aud',
  interval: 'year',
  envVar: 'STRIPE_PRICE_ORG_ANNUAL',
  lookupKey: 'carsi_org_annual',
};

/**
 * One extra staff seat on a Teams subscription (founder ruling 23/11/2026, "Build seat billing
 * now"). Extra seats are their own subscription item on this Price, beside the tier's flat base
 * Price; the item's quantity is the number of extra seats. Checkout and seat expansion only use
 * a Price that matches this entry.
 */
export const EXTRA_STAFF_SEAT: MembershipPrice = {
  amountCents: 69_500,
  currency: 'aud',
  interval: 'year',
  envVar: 'STRIPE_PRICE_TEAMS_EXTRA_SEAT',
  lookupKey: 'carsi_teams_extra_seat',
};

/** Whole dollars, e.g. 795 or 1295. */
export function membershipAmountAud(price: MembershipPrice): number {
  return price.amountCents / 100;
}

/** "$795" / "$1,295" (whole dollars; every membership price is a whole dollar amount). */
export function formatMembershipAud(price: MembershipPrice): string {
  return `$${membershipAmountAud(price).toLocaleString('en-AU')}`;
}

/** "$795 / year". */
export function annualPriceLabel(price: MembershipPrice): string {
  return `${formatMembershipAud(price)} / year`;
}

/** "+$695/seat per year". */
export function extraSeatLabel(): string {
  return `+${formatMembershipAud(EXTRA_STAFF_SEAT)}/seat per year`;
}
