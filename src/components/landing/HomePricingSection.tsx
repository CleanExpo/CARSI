import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
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
 * Split-screen pricing — sticky story left, stacked plans right (not a 3-up card grid).
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
        'Every learner gets the Free Library at no cost — start building skills and CEC tracking today.',
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
      className="relative border-t border-slate-200/80 bg-[#f6f8fb] py-16 md:py-24 dark:border-white/10 dark:bg-[#050505]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(36,144,237,0.1),transparent_55%)] dark:bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(36,144,237,0.16),transparent_55%)]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              Pricing
            </p>
            <h2
              id="home-pricing-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
            >
              Simple pricing, built for restoration teams
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
              Start free, buy any course outright, or unlock 100% access with a yearly membership —
              IICRC CEC tracking and verified certificates included.
            </p>
            <Link
              href="/pricing"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
            >
              Compare all plans, including team seats
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition duration-300 sm:flex-row sm:items-center sm:gap-8 sm:p-7 ${
                  tier.highlighted
                    ? 'border-[#146fc2]/50 bg-white shadow-[0_24px_60px_-36px_rgba(20,111,194,0.45)] dark:border-[#2490ed]/45 dark:bg-[#0f172a]'
                    : 'border-slate-200/90 bg-white/80 hover:border-[#2490ed]/30 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#2490ed]/35'
                }`}
              >
                {tier.highlighted ? (
                  <span className="absolute top-4 right-4 rounded-full bg-[#146fc2] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    Best value
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">{tier.name}</h3>
                  <p className="mt-2 flex flex-wrap items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {tier.price}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-white/55">{tier.cadence}</span>
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-white/60">
                    {tier.description}
                  </p>
                </div>
                <div className="mt-5 shrink-0 sm:mt-0">
                  {tier.comingSoon ? (
                    <span
                      aria-disabled="true"
                      className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40"
                    >
                      {tier.cta}
                    </span>
                  ) : (
                    <Link
                      href={tier.href}
                      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                        tier.highlighted
                          ? 'bg-[#146fc2] text-white shadow-sm hover:bg-[#0f5fa8]'
                          : 'border border-[#146fc2]/35 text-[#146fc2] hover:border-[#146fc2] dark:border-[#2490ed]/40 dark:text-[#8fd0ff]'
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
