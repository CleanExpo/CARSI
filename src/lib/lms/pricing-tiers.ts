/** Individual vs Teams pricing (Phase 2) — aligned with /pricing and EnrolButton. */

import {
  annualPriceLabel,
  BUSINESS_OWNER_PLAN,
  extraSeatLabel,
  INDIVIDUAL_MEMBERSHIP,
  TEAMS_OWNER_PLAN_INCLUDED_SEATS,
} from '@/lib/lms/membership-prices';

export type IndividualTierId = 'per_course' | 'pro_annual';
/** The one Teams plan (Phill 23/11/2026). Also the Stripe subscription `plan` metadata. */
export type TeamBundleTierId = 'business_owner';

export interface IndividualTier {
  id: IndividualTierId;
  name: string;
  priceLabel: string;
  priceCents: number | null;
  description: string;
  cta: string;
  href: string;
  /** WS0 (GP-440): true while checkout for this tier cannot be delivered. No CTA, no href. */
  comingSoon?: boolean;
}

export interface TeamTier {
  id: TeamBundleTierId;
  name: string;
  priceLabel: string;
  priceCents: number;
  seatsIncluded: number;
  perSeatExpansionLabel: string;
  description: string;
  features: string[];
  cta: string;
  /** WS0 (GP-440): true while checkout for this tier cannot be delivered. No CTA, no href. */
  comingSoon?: boolean;
}

/**
 * Shown when the lowest published course price cannot be read (no database and no API, or the
 * build-time prerender). Deliberately carries no number: a stale "From $X" is a wrong price
 * claim, and a missing figure is not.
 */
export const PER_COURSE_PRICE_FALLBACK_LABEL = 'Priced per course';

/**
 * "From $N" for the per-course tier, built from the lowest price among PAID published
 * courses (`PublicCatalogueFacts.minPaidCoursePriceAud`), which comes from the same source as
 * the `/courses` list. Returns null when there is no usable figure, so each caller decides
 * what to say instead of printing a guess.
 */
export function perCoursePriceLabel(
  minPaidCoursePriceAud: number | null | undefined
): string | null {
  if (typeof minPaidCoursePriceAud !== 'number') return null;
  if (!Number.isFinite(minPaidCoursePriceAud) || minPaidCoursePriceAud <= 0) return null;
  const amount = Number.isInteger(minPaidCoursePriceAud)
    ? String(minPaidCoursePriceAud)
    : minPaidCoursePriceAud.toFixed(2);
  return `From $${amount}`;
}

export const INDIVIDUAL_TIERS: IndividualTier[] = [
  {
    id: 'per_course',
    name: 'Per course',
    // The real "From $N" figure is derived at render time from the live catalogue via
    // perCoursePriceLabel(); this static value is only the no-data fallback.
    priceLabel: PER_COURSE_PRICE_FALLBACK_LABEL,
    priceCents: null,
    // Not every course carries IICRC CECs, so this must not call every per-course purchase
    // an IICRC Approved CEC Provider. Only courses the IICRC has approved for CECs earn them.
    description:
      'Pay once per course. CECs are tracked on completion, only for courses the IICRC has approved.',
    cta: 'Browse courses',
    href: '/courses',
  },
  {
    id: 'pro_annual',
    name: 'Yearly membership',
    priceLabel: annualPriceLabel(INDIVIDUAL_MEMBERSHIP),
    priceCents: INDIVIDUAL_MEMBERSHIP.amountCents,
    description: '100% access to all published CARSI courses for one learner for 12 months.',
    cta: 'Coming soon',
    href: '/subscribe',
    comingSoon: true,
  },
];

/**
 * Teams is ONE plan (Phill 23/11/2026, "Your 20/10 prices only"): the business owner plan at
 * A$1,295 a year, plus A$695 a year for each extra staff member, each with their own login.
 * Every amount is read from `membership-prices.ts`. The earlier A$299 / A$799 / A$2,499 bundles
 * (#825) were never ruled by the founder and are retired.
 */
export const TEAM_TIERS: TeamTier[] = [
  {
    id: 'business_owner',
    name: 'Business owner plan',
    priceLabel: annualPriceLabel(BUSINESS_OWNER_PLAN),
    priceCents: BUSINESS_OWNER_PLAN.amountCents,
    seatsIncluded: TEAMS_OWNER_PLAN_INCLUDED_SEATS,
    perSeatExpansionLabel: extraSeatLabel(),
    description:
      'For the business owner, with a dashboard to track staff training. Add each staff member with their own login.',
    features: [
      'The owner’s own login',
      `${extraSeatLabel()} for each staff member, each with their own login`,
      'Owner dashboard, invites and progress across staff',
    ],
    cta: 'Coming soon',
    comingSoon: true,
  },
];

export function teamTierById(id: string): TeamTier | undefined {
  return TEAM_TIERS.find((t) => t.id === id);
}

export function teamSeatLimitForTier(tierId: TeamBundleTierId): number {
  return teamTierById(tierId)?.seatsIncluded ?? TEAMS_OWNER_PLAN_INCLUDED_SEATS;
}

/**
 * Industry-specific bundle CTA prices (GP-460), shown on each
 * `app/(public)/industries/*` marketing page. These are display-only —
 * every CTA links to `/pricing` or `/courses`, not a distinct Stripe Price —
 * so cents here are for consistent formatting, not checkout.
 *
 * Previously hardcoded as a `price="$XXX"` string literal on each of the 22
 * industry pages that advertise a bundle price (aged-care is excluded — it
 * advertises the individual annual membership price instead, a different
 * concept out of this map's scope). Single-sourced here so a price change
 * doesn't require editing 22 files.
 */
export const INDUSTRY_BUNDLE_PRICE_CENTS: Record<string, number> = {
  'caravan-parks': 22500,
  childcare: 19500,
  'commercial-cleaning': 19500,
  construction: 24500,
  'data-centres': 28500,
  education: 29500,
  'emergency-management': 26500,
  'food-processing': 27500,
  'government-defence': 29500,
  'gyms-fitness': 22500,
  healthcare: 29500,
  hospitality: 29500,
  insurance: 29500,
  mining: 24500,
  'museums-cultural': 26500,
  'ndis-disability': 26500,
  'plumbing-trades': 24500,
  'property-management': 19500,
  'real-estate': 22500,
  retail: 29500,
  strata: 29500,
  'transport-logistics': 25500,
};

/** Formats an industry-bundle price as the existing "$XXX" display convention. */
export function industryBundlePriceLabel(industrySlug: string): string {
  const cents = INDUSTRY_BUNDLE_PRICE_CENTS[industrySlug];
  if (cents === undefined) {
    throw new Error(`No industry bundle price configured for slug "${industrySlug}"`);
  }
  return `$${Math.round(cents / 100)}`;
}
