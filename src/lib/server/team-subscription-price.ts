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
 * GP-773: the checkout bills `unit_amount × seatsIncluded`, so the Price is read
 * from Stripe and must bill exactly the tier total shown on /pricing (AUD,
 * yearly, per-unit). A Price that would bill any other total resolves to `null`
 * and the checkout route FAILS CLOSED with its honest "not yet available"
 * response — it never charges an amount the page did not show.
 */

import { getStripeClient } from '@/lib/api/stripe';
import { teamTierById, type TeamBundleTierId, type TeamTier } from '@/lib/lms/pricing-tiers';
import type { StripePriceLike } from '@/lib/server/membership-price-check';

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

type TeamStripePrice = StripePriceLike & {
  billing_scheme?: string | null;
  transform_quantity?: unknown;
};

/**
 * True only when `quantity = seatsIncluded` on this Price bills exactly the tier's displayed
 * yearly total in AUD: active, per-unit, no quantity transform, yearly, interval count 1.
 */
export function teamTierPriceMatches(price: TeamStripePrice | null | undefined, tier: TeamTier): boolean {
  if (!price || price.active === false) return false;
  if ((price.currency ?? '').toLowerCase() !== 'aud') return false;
  if (price.billing_scheme && price.billing_scheme !== 'per_unit') return false;
  if (price.transform_quantity) return false;
  const recurring = price.recurring;
  if (!recurring || recurring.interval !== 'year' || (recurring.interval_count ?? 1) !== 1) {
    return false;
  }
  const unit = price.unit_amount;
  if (typeof unit !== 'number' || !Number.isInteger(unit)) return false;
  return unit * tier.seatsIncluded === tier.priceCents;
}

/**
 * Returns the verified Price id for a Teams tier, or `null` when it cannot be
 * resolved or would bill a different total. Never throws — a null return is the
 * fail-closed signal for callers.
 */
export async function resolveTeamTierPriceId(
  tier: TeamBundleTierId,
): Promise<string | null> {
  const config = TEAMS_TIER_PRICE_CONFIG[tier];
  const tierConfig = teamTierById(tier);
  if (!config || !tierConfig) return null;

  const cached = cache.get(tier);
  if (cached) return cached;

  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;

  try {
    const stripe = getStripeClient();
    const envPrice = process.env[config.envVar]?.trim();
    let price: TeamStripePrice | undefined;
    if (envPrice) {
      price = (await stripe.prices.retrieve(envPrice)) as TeamStripePrice;
    } else {
      const prices = await stripe.prices.list({
        lookup_keys: [config.lookupKey],
        active: true,
        limit: 1,
      });
      price = prices.data[0] as TeamStripePrice | undefined;
    }
    if (!price?.id) return null;
    if (!teamTierPriceMatches(price, tierConfig)) {
      console.error(
        `[team-subscription-price] Stripe Price ${price.id} would not bill the ${tier} total ` +
          `(${tierConfig.priceCents} aud per year for ${tierConfig.seatsIncluded} seats); checkout refused.`
      );
      return null;
    }
    cache.set(tier, price.id);
    return price.id;
  } catch (error) {
    console.error('[team-subscription-price] Stripe price lookup failed:', error);
    return null;
  }
}
