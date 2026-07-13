import Link from 'next/link';

import { INDIVIDUAL_TIERS, TEAM_TIERS, type IndividualTier, type TeamTier } from '@/lib/lms/pricing-tiers';

/**
 * When SUBSCRIPTIONS_ENABLED is on (passed from the server page), the individual
 * `pro_annual` tier becomes purchasable — its coming-soon lock is lifted and the
 * CTA links to /subscribe. Teams tiers (WS1-E2, GP-442) likewise become
 * purchasable — see resolveTeamTiers.
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
 * When the flag is on, lift the Teams coming-soon lock (WS1-E2, GP-442). The CTA
 * routes owners to the team dashboard where they start the seat subscription
 * checkout; the full-library tier stays sales-led (contact) as before.
 */
function resolveTeamTiers(subscriptionsEnabled: boolean): TeamTier[] {
  if (!subscriptionsEnabled) return TEAM_TIERS;
  return TEAM_TIERS.map((tier) => ({ ...tier, comingSoon: false, cta: 'Start Teams plan' }));
}

export function PricingTiers({ subscriptionsEnabled = false }: { subscriptionsEnabled?: boolean }) {
  const individualTiers = resolveIndividualTiers(subscriptionsEnabled);
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
                  aria-disabled="true"
                  className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  {tier.cta}
                </span>
              ) : (
                <Link
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
          {resolveTeamTiers(subscriptionsEnabled).map((tier) => (
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
                  aria-disabled="true"
                  className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  {tier.cta}
                </span>
              ) : (
                <Link
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
