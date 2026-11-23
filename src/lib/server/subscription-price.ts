/**
 * Resolve the Stripe Price id for the individual annual membership.
 *
 * Resolution order (founder-locked, GP-441):
 *  1. `STRIPE_PRICE_PRO_ANNUAL` env var if set — an explicit override.
 *  2. Otherwise look up by `lookup_key` = 'carsi_pro_annual' at runtime and
 *     cache the result for the lifetime of the server process.
 *
 * GP-773: either way the Price must match `INDIVIDUAL_MEMBERSHIP` in
 * `src/lib/lms/membership-prices.ts` (amount, AUD, yearly). Until such a Price
 * exists this resolver returns `null` and the checkout route FAILS CLOSED with
 * an honest "membership purchasing not yet available" response — it never falls
 * back to a wrong Price.
 */

import { INDIVIDUAL_MEMBERSHIP } from '@/lib/lms/membership-prices';
import { resolveVerifiedMembershipPriceId } from '@/lib/server/membership-price-check';

/** The lookup_key the runbook instructs the operator to set on the annual Price. */
export const PRO_ANNUAL_LOOKUP_KEY = INDIVIDUAL_MEMBERSHIP.lookupKey as string;

const cache: { id: string | null } = { id: null };

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetSubscriptionPriceCache(): void {
  cache.id = null;
}

/**
 * Returns the verified annual-membership Price id, or `null` when it cannot be
 * resolved or does not match the membership price. Never throws — a null
 * return is the fail-closed signal for callers.
 */
export async function resolveProAnnualPriceId(): Promise<string | null> {
  return resolveVerifiedMembershipPriceId(INDIVIDUAL_MEMBERSHIP, cache, 'subscription-price');
}
