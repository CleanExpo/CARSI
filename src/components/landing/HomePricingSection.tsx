'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
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
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
  comingSoon?: boolean;
};

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/** Perforation line with punched notches, the ticket detail. */
function Perforation({ notchClass }: { notchClass: string }) {
  return (
    <div className="relative my-6" aria-hidden>
      <div className="border-t border-dashed border-current opacity-20" />
      <span
        className={`absolute top-1/2 -left-10 h-6 w-6 -translate-y-1/2 rounded-full sm:-left-11 ${notchClass}`}
      />
      <span
        className={`absolute top-1/2 -right-10 h-6 w-6 -translate-y-1/2 rounded-full sm:-right-11 ${notchClass}`}
      />
    </div>
  );
}

/**
 * Access-pass pricing. Three ticket-style passes with perforation lines and
 * punched notches; the membership pass is a deep blue premium card. Echoes the
 * credentials exhibit: pricing rendered as an artefact, not a table.
 */
export function HomePricingSection({
  subscriptionsEnabled = false,
}: {
  subscriptionsEnabled?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const { perCourse, yearly } = buildHomeTiers(subscriptionsEnabled);

  const tiers: HomeTier[] = [
    {
      name: 'Free Library',
      price: '$0',
      cadence: 'no card required',
      description:
        'Start tonight with the Free Library. Real courses, real certificates, and progress tracking at no cost.',
      features: ['Real courses, not samples', 'Certificates included', 'Progress tracking'],
      cta: 'Start free',
      href: '/courses',
      featured: false,
    },
    {
      name: perCourse?.name ?? 'Per course',
      price: perCourse?.priceLabel ?? 'From $20',
      cadence: 'per course',
      description:
        perCourse?.description ??
        'Pay once per IICRC CEC Accredited course. CECs tracked on completion.',
      features: ['Pay once, keep access', 'IICRC CECs on approved courses', 'Start immediately'],
      cta: perCourse?.cta ?? 'Browse courses',
      href: perCourse?.href ?? '/courses',
      featured: false,
    },
    {
      name: yearly?.name ?? 'Yearly membership',
      price: '$795',
      cadence: 'per year',
      description:
        yearly?.description ??
        '100% access to all published CARSI courses for one learner for 12 months.',
      features: ['Every published course', 'One learner, 12 months', 'CEC tracking built in'],
      cta: yearly?.cta ?? 'Coming soon',
      href: yearly?.href ?? '/subscribe',
      featured: true,
      comingSoon: yearly?.comingSoon ?? true,
    },
  ];

  return (
    <section
      aria-labelledby="home-pricing-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Soft stage: central glow and a faint masked grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[38%] left-1/2 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.12),transparent_70%)] blur-[80px]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_55%,black,transparent)] opacity-30">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        </div>
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
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

        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-5 lg:gap-7">
          {tiers.map((tier, index) => {
            const isDark = tier.featured;
            return (
              <motion.div
                key={tier.name}
                className={isDark ? 'md:-mt-4 md:-mb-4' : ''}
                initial={reduceMotion ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...spring, delay: index * 0.1 }}
              >
                <div
                  className={`relative flex h-full flex-col overflow-hidden rounded-3xl px-7 pt-7 pb-7 transition-transform duration-300 motion-safe:hover:-translate-y-1.5 sm:px-8 ${
                    isDark
                      ? 'bg-gradient-to-b from-[#10609f] via-[#146fc2] to-[#1b7fd6] text-white shadow-[0_40px_80px_-36px_rgba(20,111,194,0.65)]'
                      : 'border border-slate-200/90 bg-white text-slate-900 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)]'
                  }`}
                >
                  {isDark ? (
                    <>
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute -top-16 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
                        aria-hidden
                      />
                    </>
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
                        isDark ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      {tier.name}
                    </p>
                    {isDark ? (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white uppercase ring-1 ring-white/25">
                        Best value
                      </span>
                    ) : (
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-slate-200 bg-[#fafbfc]"
                        aria-hidden
                      />
                    )}
                  </div>

                  <p className="mt-5 flex items-baseline gap-2">
                    <span
                      className={`font-[family-name:var(--font-display)] text-[2.9rem] leading-none font-semibold tracking-[-0.03em] tabular-nums ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}
                    >
                      {tier.price}
                    </span>
                    <span className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-400'}`}>
                      {tier.cadence}
                    </span>
                  </p>

                  <div className={isDark ? 'text-white' : 'text-slate-900'}>
                    <Perforation
                      notchClass={
                        isDark
                          ? 'bg-[#fafbfc] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]'
                          : 'border border-slate-200/90 bg-[#fafbfc]'
                      }
                    />
                  </div>

                  <p
                    className={`text-sm leading-relaxed ${
                      isDark ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {tier.description}
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-[13px]">
                        <span
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                            isDark ? 'bg-white/15 text-white' : 'bg-[#eef5fb] text-[#146fc2]'
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" aria-hidden />
                        </span>
                        <span className={isDark ? 'text-white/90' : 'text-slate-600'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex-1" />

                  {tier.comingSoon ? (
                    <span
                      aria-disabled="true"
                      className={`inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full text-sm font-semibold ${
                        isDark
                          ? 'bg-white/15 text-white/60 ring-1 ring-white/20'
                          : 'border border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {tier.cta}
                    </span>
                  ) : (
                    <Link
                      href={tier.href}
                      className={`group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none ${
                        isDark
                          ? 'bg-white text-[#0f5fa8] hover:bg-blue-50 focus-visible:ring-white/60'
                          : 'bg-[#146fc2] text-white hover:bg-[#0f5fa8] focus-visible:ring-[#2490ed]/40'
                      }`}
                    >
                      {tier.cta}
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">
            All prices in AUD, GST inclusive. Cancel the membership at any time.
          </p>
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
