/**
 * Resolve the Stripe Price ids for a Teams subscription (WS1-E2, GP-442; seat model GP-773).
 *
 * Seat billing (founder ruling 23/11/2026, "Build seat billing now"):
 *  - each tier has ONE flat yearly base Price billed at quantity 1, for exactly the tier total
 *    shown on /pricing (it includes the tier's seats: 5 / 15 / 25);
 *  - extra staff seats are a SEPARATE subscription item on the A$695 yearly seat Price
 *    (`EXTRA_STAFF_SEAT`), whose quantity is the number of extra seats.
 *
 * Resolution order for every Price (mirrors E1's subscription-price.ts, founder-locked):
 *  1. the explicit env override (STRIPE_PRICE_TEAMS_STARTER, …, STRIPE_PRICE_TEAMS_EXTRA_SEAT);
 *  2. otherwise the `lookup_key`, cached per process.
 * The Price is read from Stripe and must match amount, currency AUD, yearly interval and the
 * per-unit shape (`stripePriceMatches`). Anything else resolves to `null` and the caller FAILS
 * CLOSED with 503: it never charges an amount the page did not show.
 */

import { getStripeClient } from '@/lib/api/stripe';
import { EXTRA_STAFF_SEAT } from '@/lib/lms/membership-prices';
import { teamTierById, type TeamBundleTierId, type TeamTier } from '@/lib/lms/pricing-tiers';
import {
  resolveVerifiedMembershipPriceId,
  stripePriceMatches,
  type StripePriceLike,
} from '@/lib/server/membership-price-check';

/** lookup_key + env override the runbook instructs Rana to set, per tier base Price. */
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
const seatCache: { id: string | null } = { id: null };

/** Test-only: clear the module caches so a fresh resolution runs. */
export function __resetTeamSubscriptionPriceCache(): void {
  cache.clear();
  seatCache.id = null;
}

/**
 * True only when this Price, billed once (quantity 1), charges exactly the tier's displayed
 * yearly total in AUD. The shape rules belong to `stripePriceMatches`.
 */
export function teamTierBasePriceMatches(
  price: StripePriceLike | null | undefined,
  tier: TeamTier,
): boolean {
  return stripePriceMatches(price, { amountCents: tier.priceCents, currency: 'aud', interval: 'year' });
}

/**
 * Returns the verified base Price id for a Teams tier, or `null` when it cannot be resolved or
 * would bill a different total. Never throws: a null return is the fail-closed signal.
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
    let price: StripePriceLike | undefined;
    if (envPrice) {
      price = (await stripe.prices.retrieve(envPrice)) as StripePriceLike;
    } else {
      const prices = await stripe.prices.list({
        lookup_keys: [config.lookupKey],
        active: true,
        limit: 1,
      });
      price = prices.data[0] as StripePriceLike | undefined;
    }
    if (!price?.id) return null;
    if (!teamTierBasePriceMatches(price, tierConfig)) {
      console.error(
        `[team-subscription-price] Stripe Price ${price.id} is not the flat ${tier} base ` +
          `(${tierConfig.priceCents} aud per year, billed once); checkout refused.`
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

/**
 * Returns the verified extra staff seat Price id (A$695 AUD yearly, per unit), or `null`
 * (fail closed) when it is missing, unreadable or does not match.
 */
export async function resolveTeamSeatPriceId(): Promise<string | null> {
  return resolveVerifiedMembershipPriceId(EXTRA_STAFF_SEAT, seatCache, 'team-seat-price');
}
