/**
 * Resolve the Stripe Price id for the organisation subscription, which is the
 * founder's business owner plan: A$1,295 per YEAR, GST included (GP-773; it was
 * A$1,295 per month + GST under WS1-E3, GP-443).
 *
 * Resolution order (mirrors E1's subscription-price.ts, founder-locked):
 *  1. `STRIPE_PRICE_ORG_ANNUAL` env var if set — an explicit override.
 *  2. otherwise look up by `lookup_key` = 'carsi_org_annual' at runtime and
 *     cache the result for the lifetime of the server process.
 *
 * The old monthly env var (`STRIPE_PRICE_ORG_MONTHLY`) and lookup key
 * (`carsi_org_monthly`) are deliberately no longer read: a monthly Price must
 * never be sold as the yearly plan. Either way the Price must match
 * `BUSINESS_OWNER_PLAN` in `src/lib/lms/membership-prices.ts`, or this returns
 * `null` and the checkout route FAILS CLOSED.
 */

import { BUSINESS_OWNER_PLAN } from '@/lib/lms/membership-prices';
import { resolveVerifiedMembershipPriceId } from '@/lib/server/membership-price-check';

/** The lookup_key the operator sets on the business owner yearly Price. */
export const ORG_ANNUAL_LOOKUP_KEY = BUSINESS_OWNER_PLAN.lookupKey as string;

const cache: { id: string | null } = { id: null };

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetOrgSubscriptionPriceCache(): void {
  cache.id = null;
}

/**
 * Returns the verified business owner yearly Price id, or `null` when it cannot
 * be resolved or does not match. Never throws — a null return is the
 * fail-closed signal for callers.
 */
export async function resolveOrgAnnualPriceId(): Promise<string | null> {
  return resolveVerifiedMembershipPriceId(BUSINESS_OWNER_PLAN, cache, 'org-subscription-price');
}
