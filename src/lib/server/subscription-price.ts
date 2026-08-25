/**
 * Resolve the Stripe Price id for the individual annual membership.
 *
 * Resolution order (founder-locked, GP-441):
 *  1. `STRIPE_PRICE_PRO_ANNUAL` env var if set — an explicit override.
 *  2. Otherwise look up by `lookup_key` = 'carsi_pro_annual' at runtime and
 *     cache the result for the lifetime of the server process.
 *
 * The Price does NOT exist until Rana creates it per the runbook
 * (docs/runbooks/rana-stripe-connection.md). Until then this resolver returns
 * `null` and the checkout route FAILS CLOSED with an honest "membership
 * purchasing not yet available" response — it never falls back to a wrong Price.
 */

import { getStripeClient } from '@/lib/api/stripe';

/** The lookup_key the runbook instructs Rana to set on the annual Price. */
export const PRO_ANNUAL_LOOKUP_KEY = 'carsi_pro_annual';

let cachedPriceId: string | null = null;

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetSubscriptionPriceCache(): void {
  cachedPriceId = null;
}

/**
 * Returns the resolved annual-membership Price id, or `null` when it cannot be
 * resolved (env unset AND no active Price carries the lookup_key). Never throws
 * for a missing Price — a null return is the fail-closed signal for callers.
 */
export async function resolveProAnnualPriceId(): Promise<string | null> {
  const envPrice = process.env.STRIPE_PRICE_PRO_ANNUAL?.trim();
  if (envPrice) return envPrice;

  if (cachedPriceId) return cachedPriceId;

  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;

  try {
    const stripe = getStripeClient();
    const prices = await stripe.prices.list({
      lookup_keys: [PRO_ANNUAL_LOOKUP_KEY],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (price?.id) {
      cachedPriceId = price.id;
      return price.id;
    }
    return null;
  } catch (error) {
    console.error('[subscription-price] Stripe price lookup failed:', error);
    return null;
  }
}
