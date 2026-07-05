/**
 * Resolve the Stripe Price id for a Teams seat subscription tier (WS1-E2,
 * GP-442). One recurring (yearly) Price per tier; the seat count is carried by
 * the Stripe subscription `quantity`, NOT by a per-seat Price. Seat expansion is
 * a quantity change with proration (see docs/runbooks/rana-stripe-connection.md
 * and the PR body's seat-billing decision).
 *
 * Resolution order (mirrors E1's subscription-price.ts, founder-locked):
 *  1. the tier's explicit env override (STRIPE_PRICE_TEAMS_STARTER, …) if set.
 *  2. otherwise look up by `lookup_key` at runtime, cached per process.
 *
 * The Prices do NOT exist until Rana creates them. Until then this resolver
 * returns `null` and the checkout route FAILS CLOSED with an honest "not yet
 * available" response — it never falls back to a wrong Price.
 */

import { getStripeClient } from '@/lib/api/stripe';
import type { TeamBundleTierId } from '@/lib/lms/pricing-tiers';

/** lookup_key + env override the runbook instructs Rana to set, per tier. */
export const TEAMS_TIER_PRICE_CONFIG: Record<
  TeamBundleTierId,
  { lookupKey: string; envVar: string }
> = {
  starter: { lookupKey: 'carsi_teams_starter', envVar: 'STRIPE_PRICE_TEAMS_STARTER' },
  growth: { lookupKey: 'carsi_teams_growth', envVar: 'STRIPE_PRICE_TEAMS_GROWTH' },
  full_library: {
    lookupKey: 'carsi_teams_full_library',
    envVar: 'STRIPE_PRICE_TEAMS_FULL_LIBRARY',
  },
};

const cache = new Map<TeamBundleTierId, string>();

/** Test-only: clear the module cache so a fresh resolution runs. */
export function __resetTeamSubscriptionPriceCache(): void {
  cache.clear();
}

/**
 * Returns the resolved Price id for a Teams tier, or `null` when it cannot be
 * resolved (env unset AND no active Price carries the lookup_key). Never throws
 * for a missing Price — a null return is the fail-closed signal for callers.
 */
export async function resolveTeamTierPriceId(
  tier: TeamBundleTierId,
): Promise<string | null> {
  const config = TEAMS_TIER_PRICE_CONFIG[tier];
  if (!config) return null;

  const envPrice = process.env[config.envVar]?.trim();
  if (envPrice) return envPrice;

  const cached = cache.get(tier);
  if (cached) return cached;

  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;

  try {
    const stripe = getStripeClient();
    const prices = await stripe.prices.list({
      lookup_keys: [config.lookupKey],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (price?.id) {
      cache.set(tier, price.id);
      return price.id;
    }
    return null;
  } catch (error) {
    console.error('[team-subscription-price] Stripe price lookup failed:', error);
    return null;
  }
}
