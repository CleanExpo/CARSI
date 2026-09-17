import Link from 'next/link';

import {
  INDIVIDUAL_TIERS,
  TEAM_TIERS,
  type IndividualTier,
  type TeamTier,
} from '@/lib/lms/pricing-tiers';

/**
 * Stable test ids for the tier call-to-action. The disabled "coming soon" state and the live
 * buy link carry DIFFERENT ids, so a check that finds `pricing-pro_annual-coming-soon` has
 * proved the yearly plan is not on sale, not merely that a button exists. The Reticle flow
 * `.reticle/flows/carsi-0f3ff945/pricing-yearly-not-on-sale.json` and
 * `scripts/verify-go-live-readiness.mjs` both key on these.
 */
export function tierCtaTestId(tierId: string, comingSoon: boolean | undefined): string {
  return `pricing-${tierId}-${comingSoon ? 'coming-soon' : 'buy'}`;
}

/**
 * When SUBSCRIPTIONS_ENABLED is on (passed from the server page), the individual
 * `pro_annual` tier becomes purchasable: its coming-soon lock is lifted and the
 * CTA links to /subscribe. Teams tiers have their own switch, see resolveTeamTiers.
 */
function resolveIndividualTiers(subscriptionsEnabled: boolean): IndividualTier[] {
  if (!subscriptionsEnabled) return INDIVIDUAL_TIERS;
  return INDIVIDUAL_TIERS.map((tier) =>
    tier.id === 'pro_annual'
      ? { ...tier, comingSoon: false, cta: 'Start membership', href: '/subscribe' }
      : tier,
  );
}

/**
 * Lift the Teams coming-soon lock (WS1-E2, GP-442) only when `teamSubscriptionsEnabled()` is
 * true, which needs BOTH SUBSCRIPTIONS_ENABLED and TEAMS_SUBSCRIPTIONS_ENABLED. The CTA routes
 * owners to the team dashboard where they start the seat subscription checkout; the
 * full-library tier stays sales-led (contact) as before.
 */
function resolveTeamTiers(teamsEnabled: boolean): TeamTier[] {
  if (!teamsEnabled) return TEAM_TIERS;
  return TEAM_TIERS.map((tier) => ({ ...tier, comingSoon: false, cta: 'Start Teams plan' }));
}

export function PricingTiers({
  subscriptionsEnabled = false,
  teamsEnabled = false,
  perCoursePriceLabel,
}: {
  subscriptionsEnabled?: boolean;
  teamsEnabled?: boolean;
  /** The per-course price label derived from the live catalogue (`perCoursePriceLabel()`). */
  perCoursePriceLabel?: string;
}) {
  const individualTiers = resolveIndividualTiers(subscriptionsEnabled).map((tier) =>
    tier.id === 'per_course' && perCoursePriceLabel
      ? { ...tier, priceLabel: perCoursePriceLabel }
      : tier,
  );
  return (
    <>
      <section aria-label="Individual pricing" className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-950">Individual</h2>
        <p className="mb-8 text-center text-sm text-slate-600">
          One learner — buy a single course, or choose a yearly membership for 100% access to all
          published courses.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {individualTiers.map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-lg border bg-white p-6 shadow-sm"
              style={{
                borderColor:
                  tier.id === 'pro_annual' ? 'rgba(15,95,168,0.35)' : 'rgba(15,23,42,0.1)',
                background:
                  tier.id === 'pro_annual'
                    ? '#eef7ff'
                    : '#ffffff',
              }}
            >
              <h3 className="mb-1 text-lg font-bold text-slate-950">{tier.name}</h3>
              <p className="text-3xl font-bold text-slate-950">{tier.priceLabel}</p>
              <p className="mt-3 flex-1 text-sm text-slate-600">{tier.description}</p>
              {tier.comingSoon ? (
                <span
                  data-testid={tierCtaTestId(tier.id, true)}
                  aria-disabled="true"
                  className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  {tier.cta}
                </span>
              ) : (
                <Link
                  data-testid={tierCtaTestId(tier.id, false)}
                  href={tier.href}
                  className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: tier.id === 'pro_annual' ? '#0f5fa8' : 'transparent',
                    color: tier.id === 'pro_annual' ? '#ffffff' : '#146fc2',
                    border: tier.id === 'pro_annual' ? 'none' : '1px solid rgba(15,95,168,0.35)',
                  }}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Teams pricing" className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-950">Teams</h2>
        <p className="mb-8 text-center text-sm text-slate-600">
          Seat-based bundles for restoration businesses — owner dashboard, invites, and progress
          across your crew.
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {resolveTeamTiers(teamsEnabled).map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-lg border bg-white p-6 shadow-sm"
              style={{
                borderColor:
                  tier.id === 'growth' ? 'rgba(15,95,168,0.35)' : 'rgba(15,23,42,0.1)',
                background:
                  tier.id === 'growth' ? '#eef7ff' : '#ffffff',
              }}
            >
              <h3 className="mb-1 text-lg font-bold text-slate-950">{tier.name}</h3>
              <p className="text-3xl font-bold text-slate-950">{tier.priceLabel}</p>
              <p className="mt-1 text-xs text-slate-600">
                {tier.seatsIncluded} seats · {tier.perSeatExpansionLabel}
              </p>
              <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-slate-600">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#0f5fa8]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {tier.comingSoon ? (
                <span
                  data-testid={tierCtaTestId(tier.id, true)}
                  aria-disabled="true"
                  className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  {tier.cta}
                </span>
              ) : (
                <Link
                  data-testid={tierCtaTestId(tier.id, false)}
                  href={
                    tier.id === 'full_library'
                      ? '/contact?subject=teams-full-library'
                      : `/dashboard/team?create=${tier.id}`
                  }
                  className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: tier.id === 'growth' ? '#0f5fa8' : 'transparent',
                    color: tier.id === 'growth' ? '#ffffff' : '#146fc2',
                    border: tier.id === 'growth' ? 'none' : '1px solid rgba(15,95,168,0.35)',
                  }}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
