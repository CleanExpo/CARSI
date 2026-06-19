import Link from 'next/link';

import { INDIVIDUAL_TIERS, TEAM_TIERS } from '@/lib/lms/pricing-tiers';

export function PricingTiers() {
  return (
    <>
      <section aria-label="Individual pricing" className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-950">Individual</h2>
        <p className="mb-8 text-center text-sm text-slate-600">
          One learner — pay per course or unlock the full library annually.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {INDIVIDUAL_TIERS.map((tier) => (
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
          {TEAM_TIERS.map((tier) => (
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
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
