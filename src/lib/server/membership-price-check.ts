/**
 * Server-side half of the membership price source of truth (GP-773).
 *
 * A checkout only receives a Stripe Price whose amount, currency and billing interval match the
 * entry in `src/lib/lms/membership-prices.ts`. A mismatched, inactive, unreadable or missing
 * Price resolves to `null`, and the calling route FAILS CLOSED with its honest "not yet
 * available" answer. It never falls back to another Price, so a page cannot quote one price
 * while Stripe bills another.
 *
 * Tax behaviour (GST inclusive) is configured on the Price in Stripe and is not checked here.
 */

import { getStripeClient } from '@/lib/api/stripe';
import type { MembershipPrice } from '@/lib/lms/membership-prices';

/** The fields of a Stripe Price this check reads. */
export interface StripePriceLike {
  id?: string;
  active?: boolean;
  currency?: string | null;
  unit_amount?: number | null;
  billing_scheme?: string | null;
  transform_quantity?: unknown;
  recurring?: { interval?: string | null; interval_count?: number | null } | null;
}

/** What a Price must bill per unit: amount, currency and interval. */
export type PriceSpec = Pick<MembershipPrice, 'amountCents' | 'currency' | 'interval'>;

/**
 * THE one owner of the Stripe Price shape rules (GP-773). Every checkout and seat change calls
 * this; nothing re-implements it. True only for an active, per-unit Price with no quantity
 * transform, billed at exactly `spec`'s amount, currency and interval (interval count 1), so
 * `quantity x spec.amountCents` is exactly what Stripe charges.
 */
export function stripePriceMatches(price: StripePriceLike | null | undefined, spec: PriceSpec): boolean {
  if (!price) return false;
  if (price.active === false) return false;
  if (price.billing_scheme !== 'per_unit') return false;
  if (price.transform_quantity != null) return false;
  if ((price.currency ?? '').toLowerCase() !== spec.currency) return false;
  if (price.unit_amount !== spec.amountCents) return false;
  const recurring = price.recurring;
  if (!recurring || recurring.interval !== spec.interval) return false;
  return (recurring.interval_count ?? 1) === 1;
}

/**
 * Resolve a membership Price id: the spec's env var if set, otherwise its lookup key. Either way
 * the Price is read from Stripe and must match the spec. Returns `null` (fail closed) when it
 * does not, cannot be read, or Stripe is not configured. Only a verified id is cached.
 */
export async function resolveVerifiedMembershipPriceId(
  spec: MembershipPrice,
  cache: { id: string | null },
  logTag: string
): Promise<string | null> {
  if (cache.id) return cache.id;
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;

  const envId = spec.envVar ? process.env[spec.envVar]?.trim() : '';
  try {
    const stripe = getStripeClient();
    let price: StripePriceLike | undefined;
    if (envId) {
      price = (await stripe.prices.retrieve(envId)) as StripePriceLike;
    } else if (spec.lookupKey) {
      const prices = await stripe.prices.list({
        lookup_keys: [spec.lookupKey],
        active: true,
        limit: 1,
      });
      price = prices.data[0] as StripePriceLike | undefined;
    }
    if (!price?.id) return null;
    if (!stripePriceMatches(price, spec)) {
      console.error(
        `[${logTag}] Stripe Price ${price.id} does not match the membership price ` +
          `(${spec.amountCents} ${spec.currency} per ${spec.interval}); checkout refused.`
      );
      return null;
    }
    cache.id = price.id;
    return price.id;
  } catch (error) {
    console.error(`[${logTag}] Stripe price lookup failed:`, error);
    return null;
  }
}
