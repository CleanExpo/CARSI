import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';

const perCourse = INDIVIDUAL_TIERS.find((t) => t.id === 'per_course');
const yearly = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual');

type HomeTier = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  href: string;
  highlighted: boolean;
};

const TIERS: HomeTier[] = [
  {
    name: 'Free Library',
    price: '$0',
    cadence: 'no card required',
    description:
      'Every learner gets the Free Library at no cost — start building skills and CEC tracking today.',
    cta: 'Start free',
    href: '/courses',
    highlighted: false,
  },
  {
    name: perCourse?.name ?? 'Per course',
    price: perCourse?.priceLabel ?? 'From $149',
    cadence: 'per course',
    description:
      perCourse?.description ?? 'Pay once per IICRC-aligned CEC course. CECs tracked on completion.',
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
    cta: yearly?.cta ?? 'Choose yearly',
    href: yearly?.href ?? '/subscribe',
    highlighted: true,
  },
];

export function HomePricingSection() {
  return (
    <section
      aria-labelledby="home-pricing-heading"
      className="relative border-t border-slate-200/80 bg-white py-14 md:py-20 dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_90%_15%,rgba(36,144,237,0.06),transparent_60%)] dark:bg-[radial-gradient(ellipse_55%_50%_at_90%_15%,rgba(36,144,237,0.1),transparent_60%)]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#8fd0ff]">
            Pricing
          </p>
          <h2
            id="home-pricing-heading"
            className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
          >
            Simple pricing, built for restoration teams
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
            Start free, buy any course outright, or unlock 100% access with a yearly membership —
            IICRC CEC tracking and verified certificates included.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                tier.highlighted
                  ? 'border-[#146fc2] bg-[#eef7ff] shadow-md dark:border-[#2490ed]/50 dark:bg-[#2490ed]/10'
                  : 'border-slate-200 bg-[#f8fbff] dark:border-white/10 dark:bg-white/[0.04]'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#146fc2] px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                  Best value
                </span>
              )}
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{tier.name}</h3>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-slate-950 dark:text-white">
                  {tier.price}
                </span>
                <span className="text-xs text-slate-500 dark:text-white/50">{tier.cadence}</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-white/65">
                {tier.description}
              </p>
              <Link
                href={tier.href}
                className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  tier.highlighted
                    ? 'bg-[#146fc2] text-white'
                    : 'border border-[#146fc2]/35 text-[#146fc2] dark:border-[#2490ed]/40 dark:text-[#8fd0ff]'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
          >
            Compare all plans, including team seats
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
