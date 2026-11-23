/**
 * Resolve the Stripe Price ids for a Teams subscription (WS1-E2, GP-442; seat model GP-773).
 *
 * Founder rulings 23/11/2026 ("Build seat billing now", "Your 20/10 prices only"):
 *  - the base item is the business owner plan, A$1,295 a year, billed once (quantity 1). Its
 *    Price is the one the organisation checkout already verifies, so it is resolved by
 *    `resolveOrgAnnualPriceId` (env STRIPE_PRICE_ORG_ANNUAL or lookup key carsi_org_annual);
 *  - each extra staff member is one unit of a SEPARATE item on the A$695 yearly seat Price
 *    (`EXTRA_STAFF_SEAT`), resolved here.
 *
 * Each Price is read from Stripe and must match amount, currency AUD, yearly interval and the
 * per-unit shape (`stripePriceMatches`). Anything else resolves to `null` and the caller FAILS
 * CLOSED with 503: it never charges an amount the page did not show.
 */

import { EXTRA_STAFF_SEAT } from '@/lib/lms/membership-prices';
import { resolveVerifiedMembershipPriceId } from '@/lib/server/membership-price-check';

export { resolveOrgAnnualPriceId as resolveTeamOwnerPlanPriceId } from '@/lib/server/org-subscription-price';

const seatCache: { id: string | null } = { id: null };

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetTeamSubscriptionPriceCache(): void {
  seatCache.id = null;
}

/**
 * Returns the verified extra staff seat Price id (A$695 AUD yearly, per unit), or `null`
 * (fail closed) when it is missing, unreadable or does not match.
 */
export async function resolveTeamSeatPriceId(): Promise<string | null> {
  return resolveVerifiedMembershipPriceId(EXTRA_STAFF_SEAT, seatCache, 'team-seat-price');
}
