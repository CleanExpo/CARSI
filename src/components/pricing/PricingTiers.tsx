import Link from 'next/link';

import { INDIVIDUAL_TIERS, TEAM_TIERS } from '@/lib/lms/pricing-tiers';

export function PricingTiers() {
  return (
    <>
      <section aria-label="Individual pricing" className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">Individual</h2>
        <p className="mb-8 text-center text-sm text-white/45">
          One learner — pay per course or unlock the full library annually.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {INDIVIDUAL_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-sm border p-6"
              style={{
                borderColor:
                  tier.id === 'pro_annual' ? 'rgba(36,144,237,0.3)' : 'rgba(255,255,255,0.08)',
                background:
                  tier.id === 'pro_annual'
                    ? 'rgba(36,144,237,0.04)'
                    : 'rgba(255,255,255,0.02)',
              }}
            >
              <h3 className="mb-1 font-mono text-lg font-bold text-white">{tier.name}</h3>
              <p className="font-mono text-3xl font-bold text-white">{tier.priceLabel}</p>
              <p className="mt-3 flex-1 text-sm text-white/55">{tier.description}</p>
              <Link
                href={tier.href}
                className="mt-6 flex w-full items-center justify-center rounded-sm px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: tier.id === 'pro_annual' ? '#2490ed' : 'transparent',
                  border: tier.id === 'pro_annual' ? 'none' : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Teams pricing" className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">Teams</h2>
        <p className="mb-8 text-center text-sm text-white/45">
          Seat-based bundles for restoration businesses — owner dashboard, invites, and progress
          across your crew.
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TEAM_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-sm border p-6"
              style={{
                borderColor:
                  tier.id === 'growth' ? 'rgba(36,144,237,0.35)' : 'rgba(255,255,255,0.08)',
                background:
                  tier.id === 'growth' ? 'rgba(36,144,237,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <h3 className="mb-1 font-mono text-lg font-bold text-white">{tier.name}</h3>
              <p className="font-mono text-3xl font-bold text-white">{tier.priceLabel}</p>
              <p className="mt-1 text-xs text-white/35">
                {tier.seatsIncluded} seats · {tier.perSeatExpansionLabel}
              </p>
              <p className="mt-3 text-sm text-white/55">{tier.description}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-white/60">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#2490ed]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={
                  tier.id === 'full_library'
                    ? '/contact?subject=teams-full-library'
                    : `/dashboard/team?create=${tier.id}`
                }
                className="mt-6 flex w-full items-center justify-center rounded-sm px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: tier.id === 'growth' ? '#2490ed' : 'rgba(255,255,255,0.08)' }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
