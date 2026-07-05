/**
 * Resolve the Stripe Price id for the organisation monthly subscription
 * (WS1-E3, GP-443) — A$1,295/month + GST, unlimited learners.
 *
 * Resolution order (mirrors E1's subscription-price.ts, founder-locked):
 *  1. `STRIPE_PRICE_ORG_MONTHLY` env var if set — an explicit override.
 *  2. otherwise look up by `lookup_key` = 'carsi_org_monthly' at runtime and
 *     cache the result for the lifetime of the server process.
 *
 * The Price does NOT exist until Rana creates it per the runbook. Until then
 * this resolver returns `null` and the checkout route FAILS CLOSED with an
 * honest "not yet available" response — it never falls back to a wrong Price.
 */

import { getStripeClient } from '@/lib/api/stripe';

/** The lookup_key the runbook instructs Rana to set on the org monthly Price. */
export const ORG_MONTHLY_LOOKUP_KEY = 'carsi_org_monthly';

let cachedPriceId: string | null = null;

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetOrgSubscriptionPriceCache(): void {
  cachedPriceId = null;
}

/**
 * Returns the resolved org-monthly Price id, or `null` when it cannot be
 * resolved. Never throws for a missing Price — a null return is the fail-closed
 * signal for callers.
 */
export async function resolveOrgMonthlyPriceId(): Promise<string | null> {
  const envPrice = process.env.STRIPE_PRICE_ORG_MONTHLY?.trim();
  if (envPrice) return envPrice;

  if (cachedPriceId) return cachedPriceId;

  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;

  try {
    const stripe = getStripeClient();
    const prices = await stripe.prices.list({
      lookup_keys: [ORG_MONTHLY_LOOKUP_KEY],
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
    console.error('[org-subscription-price] Stripe price lookup failed:', error);
    return null;
  }
}
