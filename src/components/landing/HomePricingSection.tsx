import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';

function buildHomeTiers(subscriptionsEnabled: boolean) {
  const perCourse = INDIVIDUAL_TIERS.find((t) => t.id === 'per_course');
  const yearlyBase = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual');
  const yearlyLive =
    subscriptionsEnabled && yearlyBase
      ? { ...yearlyBase, comingSoon: false, cta: 'Start membership', href: '/subscribe' }
      : yearlyBase;

  return { perCourse, yearly: yearlyLive };
}

type HomeTier = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  href: string;
  highlighted: boolean;
  comingSoon?: boolean;
};

/**
 * Minimal light pricing. Typographic rows, hairline dividers, no heavy cards.
 * The best-value row gets a soft ice highlight band instead of a card shell.
 */
export function HomePricingSection({
  subscriptionsEnabled = false,
}: {
  subscriptionsEnabled?: boolean;
}) {
  const { perCourse, yearly } = buildHomeTiers(subscriptionsEnabled);

  const tiers: HomeTier[] = [
    {
      name: 'Free Library',
      price: '$0',
      cadence: 'no card required',
      description:
        'Start tonight with the Free Library. Real courses, real certificates, and progress tracking at no cost.',
      cta: 'Start free',
      href: '/courses',
      highlighted: false,
    },
    {
      name: perCourse?.name ?? 'Per course',
      price: perCourse?.priceLabel ?? 'From $20',
      cadence: 'per course',
      description:
        perCourse?.description ??
        'Pay once per IICRC CEC Accredited course. CECs tracked on completion.',
      cta: perCourse?.cta ?? 'Browse courses',
      href: perCourse?.href ?? '/courses',
      highlighted: false,
    },
    {
      name: yearly?.name ?? 'Yearly membership',
      price: '$795',
      cadence: '/ year · 100% access',
      description:
        yearly?.description ??
        '100% access to all published CARSI courses for one learner for 12 months.',
      cta: yearly?.cta ?? 'Coming soon',
      href: yearly?.href ?? '/subscribe',
      highlighted: !yearly?.comingSoon,
      comingSoon: yearly?.comingSoon ?? true,
    },
  ];

  return (
    <section
      aria-labelledby="home-pricing-heading"
      className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>Pricing</p>
          <h2 id="home-pricing-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Pay for training, not for overheads
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            Start free, buy single courses as you need them, or unlock the whole catalogue.
            Transparent AUD pricing with CEC tracking included on approved courses.
          </p>
        </div>

        <div className="mt-14 divide-y divide-slate-200/80 border-y border-slate-200/80">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`grid gap-4 py-8 sm:grid-cols-[minmax(0,1.2fr)_auto] sm:items-center sm:gap-10 ${
                tier.highlighted
                  ? 'rounded-2xl bg-[#eef5fb] px-6 -mx-6 sm:px-8 sm:-mx-8'
                  : ''
              }`}
            >
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                    {tier.name}
                  </h3>
                  {tier.highlighted ? (
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
                      Best value
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
                    {tier.price}
                  </span>
                  <span className="text-sm text-slate-400">{tier.cadence}</span>
                </p>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                  {tier.description}
                </p>
              </div>
              <div className="sm:justify-self-end">
                {tier.comingSoon ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-6 text-sm font-semibold text-slate-400"
                  >
                    {tier.cta}
                  </span>
                ) : (
                  <Link
                    href={tier.href}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none ${
                      tier.highlighted
                        ? 'bg-[#146fc2] text-white hover:bg-[#0f5fa8]'
                        : 'border border-slate-200 bg-white text-slate-800 hover:border-[#2490ed]/45 hover:text-[#146fc2]'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          GST inclusive AUD pricing. Cancel anytime for membership.
        </p>

        <div className="mt-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
          >
            Compare all plans, including team seats
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
