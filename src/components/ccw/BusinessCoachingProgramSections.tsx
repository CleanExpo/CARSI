'use client';

import { Check, Plus } from 'lucide-react';
import Link from 'next/link';

import { BusinessCoachingMonthlySubscribe } from '@/components/ccw/BusinessCoachingMonthlySubscribe';
import { CoachingComingSoonBanner } from '@/components/ccw/CoachingComingSoonBanner';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import {
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import {
  carsiCoachingAddOns,
  carsiCoachingAddOnsComingSoon,
  carsiCoachingPortalPath,
  carsiCoachingMonthlyInclusions,
  carsiCoachingPortalFeatures,
} from '@/lib/marketing/carsi-coaching-program';

function BillingBadge({ billing }: { billing: string }) {
  const labels: Record<string, string> = {
    monthly: 'Monthly',
    one_off: 'One-off',
    per_seat: 'Per seat',
    from: 'From',
    quarterly: 'Quarterly',
  };
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
      {labels[billing] ?? billing}
    </span>
  );
}

export function BusinessCoachingInclusionsSection() {
  return (
    <section
      className="border-t border-slate-200/70 bg-white py-16 md:py-24"
      aria-labelledby="coaching-inclusions-heading"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>What you get</p>
        <h2 id="coaching-inclusions-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          Everything in {carsiCoachingMonthlyPriceLabel}
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          One subscription covers strategy, marketing, operations, training, AI, your monthly
          session with Phill, and full access to the Business Coaching Portal.
        </p>

        <div className="mt-12 space-y-10">
          {carsiCoachingMonthlyInclusions.map((block) => (
            <div key={block.category}>
              <h3 className="text-sm font-semibold tracking-wide text-[#146fc2] uppercase">
                {block.category}
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {block.items.map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 rounded-xl border border-slate-200/80 bg-[#fafbfc] p-4"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BusinessCoachingAddOnsSection({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const addOns = carsiCoachingAddOns.filter((a) => !a.includedInBase);

  return (
    <section
      className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
      aria-labelledby="coaching-addons-heading"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Add-ons</p>
        <h2 id="coaching-addons-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          Optional extras with clear pricing
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          The core program is {carsiCoachingMonthlyPriceLabel}. Planned optional extras and prices
          are below for transparency.
        </p>

        {carsiCoachingAddOnsComingSoon ? (
          <div className="mt-6">
            <CoachingComingSoonBanner label="Add-on booking — coming soon" />
          </div>
        ) : null}

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 sm:px-6">Add-on</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="hidden px-4 py-3 md:table-cell">What it is</th>
                  <th className="px-4 py-3 text-right sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-[#eef5fb]/50">
                  <td className="px-4 py-4 font-semibold text-slate-950 sm:px-6">
                    {carsiCoachingProductName}
                    <span className="ml-2 rounded bg-[#146fc2] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                      Included
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#146fc2] tabular-nums">
                    {carsiCoachingMonthlyPriceLabel}
                  </td>
                  <td className="hidden px-4 py-4 text-slate-600 md:table-cell">
                    Full program + portal + monthly session
                  </td>
                  <td className="px-4 py-4 text-right sm:px-6">
                    <div className="inline-block min-w-[140px]">
                      <BusinessCoachingMonthlySubscribe checkoutEnabled={checkoutEnabled} />
                    </div>
                  </td>
                </tr>
                {addOns.map((addOn) => (
                  <tr key={addOn.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4 font-medium text-slate-950 sm:px-6">
                      <span className="flex flex-wrap items-center gap-2">
                        <Plus className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        {addOn.title}
                      </span>
                      <p className="mt-1 text-xs text-slate-500 md:hidden">{addOn.description}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {addOn.priceLabel}
                      </span>
                      <div className="mt-1">
                        <BillingBadge billing={addOn.billing} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-slate-600 md:table-cell">
                      {addOn.description}
                    </td>
                    <td className="px-4 py-4 text-right sm:px-6">
                      {carsiCoachingAddOnsComingSoon ? (
                        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                          Coming soon
                        </span>
                      ) : addOn.href ? (
                        <a
                          href={addOn.href}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2] hover:underline"
                        >
                          {addOn.cta ?? 'View'}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">{addOn.cta ?? 'Enquire'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BusinessCoachingPortalSection() {
  return (
    <section
      className="border-t border-slate-200/70 bg-white py-16 md:py-24"
      aria-labelledby="coaching-portal-heading"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className={LANDING_EYEBROW_CLASS}>Subscriber portal</p>
            <h2 id="coaching-portal-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Business Coaching Portal
            </h2>
            <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
              Subscribers get a dedicated coaching portal (separate from My Learning) for your plan,
              monthly actions, and session prep between calls with Phill.
            </p>
            <Link
              href={carsiCoachingPortalPath}
              className="mt-6 inline-flex rounded-full bg-[#146fc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125da8]"
            >
              Open coaching portal
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 shadow-sm md:p-8">
            <h3 className="text-sm font-semibold text-slate-950">Planned for the portal</h3>
            <ul className="mt-4 space-y-4">
              {carsiCoachingPortalFeatures.map((f) => (
                <li
                  key={f.title}
                  className="border-b border-slate-200/80 pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
