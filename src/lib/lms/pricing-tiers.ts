/** Individual vs Teams pricing (Phase 2) — aligned with /pricing and EnrolButton. */

export type IndividualTierId = 'per_course' | 'pro_annual';
export type TeamBundleTierId = 'starter' | 'growth' | 'full_library';

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

export const INDIVIDUAL_TIERS: IndividualTier[] = [
  {
    id: 'per_course',
    name: 'Per course',
    priceLabel: 'From $149',
    priceCents: null,
    description: 'Pay once per IICRC-aligned CEC course. CECs tracked on completion.',
    cta: 'Browse courses',
    href: '/courses',
  },
  {
    id: 'pro_annual',
    name: 'Yearly membership',
    priceLabel: '$795 / year',
    priceCents: 79500,
    description: '100% access to all published CARSI courses for one learner for 12 months.',
    cta: 'Coming soon',
    href: '/subscribe',
    comingSoon: true,
  },
];

export const TEAM_TIERS: TeamTier[] = [
  {
    id: 'starter',
    name: 'Teams Starter',
    priceLabel: '$299 / year',
    priceCents: 29900,
    seatsIncluded: 5,
    perSeatExpansionLabel: '+$49/seat',
    description: 'Small restoration crews — core water & mould pathways.',
    features: ['5 seats included', 'Owner dashboard & invites', 'Progress across seats'],
    cta: 'Coming soon',
    comingSoon: true,
  },
  {
    id: 'growth',
    name: 'Teams Growth',
    priceLabel: '$799 / year',
    priceCents: 79900,
    seatsIncluded: 15,
    perSeatExpansionLabel: '+$39/seat',
    description: 'Growing businesses training multiple technicians.',
    features: ['15 seats included', 'All Starter features', 'Priority email support'],
    cta: 'Coming soon',
    comingSoon: true,
  },
  {
    id: 'full_library',
    name: 'Full library',
    priceLabel: '$2,499 / year',
    priceCents: 249900,
    seatsIncluded: 25,
    perSeatExpansionLabel: '+$29/seat',
    description: 'Enterprise-style access to the full published catalogue.',
    features: ['25 seats included', 'All Growth features', 'Dedicated onboarding call'],
    cta: 'Coming soon',
    comingSoon: true,
  },
];

export function teamTierById(id: string): TeamTier | undefined {
  return TEAM_TIERS.find((t) => t.id === id);
}

export function teamSeatLimitForTier(tierId: TeamBundleTierId): number {
  return teamTierById(tierId)?.seatsIncluded ?? 5;
}
