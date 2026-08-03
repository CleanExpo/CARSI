'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Baby,
  Building2,
  GraduationCap,
  HandHeart,
  HardHat,
  HeartPulse,
  Hotel,
  KeyRound,
  Landmark,
  Pickaxe,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

const SECTORS = [
  {
    slug: 'healthcare',
    label: 'Healthcare',
    icon: HeartPulse,
    description: 'Infection control and moisture response for clinical environments.',
    chips: ['Infection control', 'Mould response', 'Compliance ready'],
  },
  {
    slug: 'hospitality',
    label: 'Hotels & Resorts',
    icon: Hotel,
    description: 'Fast turnarounds that protect guest experience and star ratings.',
    chips: ['Rapid drying', 'Odour removal', 'Guest-ready finishes'],
  },
  {
    slug: 'government-defence',
    label: 'Government & Defence',
    icon: Landmark,
    description: 'Documented procedures for secure sites and public assets.',
    chips: ['Secure sites', 'Documented process', 'Asset protection'],
  },
  {
    slug: 'commercial-cleaning',
    label: 'Commercial Cleaning',
    icon: Sparkles,
    description: 'Core chemistry, equipment, and safe work practice for professional crews.',
    chips: ['Chemistry basics', 'Equipment care', 'Safe work practice'],
  },
  {
    slug: 'aged-care',
    label: 'Aged Care',
    icon: HandHeart,
    description: 'Gentle, low-disruption remediation around vulnerable residents.',
    chips: ['Resident safety', 'Low-odour methods', 'Duty of care'],
  },
  {
    slug: 'mining',
    label: 'Mining & Resources',
    icon: Pickaxe,
    description: 'Heavy-duty response for remote sites and demanding rosters.',
    chips: ['Remote sites', 'Harsh conditions', 'Roster friendly'],
  },
  {
    slug: 'education',
    label: 'Education',
    icon: GraduationCap,
    description: 'Safe remediation for classrooms, halls, and boarding facilities.',
    chips: ['Holiday scheduling', 'Air quality', 'Safe reopening'],
  },
  {
    slug: 'property-management',
    label: 'Property Management',
    icon: KeyRound,
    description: 'Make-good and water response that keeps tenancies moving.',
    chips: ['Water response', 'Make-good', 'Owner reporting'],
  },
  {
    slug: 'strata',
    label: 'Strata & Body Corporate',
    icon: Building2,
    description: 'Shared-asset restoration with clear scopes and committee-ready reports.',
    chips: ['Common property', 'Clear scoping', 'Committee reports'],
  },
  {
    slug: 'retail',
    label: 'Retail & Shopping Centres',
    icon: ShoppingBag,
    description: 'After-hours response that keeps doors open and stock protected.',
    chips: ['After-hours work', 'Stock protection', 'Minimal downtime'],
  },
  {
    slug: 'childcare',
    label: 'Childcare',
    icon: Baby,
    description: 'Meticulous hygiene and mould response for early learning spaces.',
    chips: ['Hygiene standards', 'Mould response', 'Child-safe methods'],
  },
  {
    slug: 'construction',
    label: 'Construction',
    icon: HardHat,
    description: 'Moisture management and handover cleans for new builds.',
    chips: ['Moisture management', 'Handover cleans', 'Site coordination'],
  },
] as const;

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Interactive sector explorer. A rail of twelve sector links drives a large
 * premium preview panel: hovering or focusing a sector crossfades the panel to
 * that sector's icon, description, outcome chips, and pathway link. The rail
 * collapses to a horizontally scrollable chip row on small screens.
 */
export function HomeIndustriesSection() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = SECTORS[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <section
      aria-labelledby="home-industries-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Soft stage: brand glow near the panel plus a faint masked dot texture */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[46%] right-[-14%] h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.11),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_55%_55%_at_28%_62%,black,transparent)] opacity-35">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,23,42,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>Industries</p>
          <h2 id="home-industries-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Trained for every sector you serve
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            From hospitals to hotels, sector-specific pathways prepare crews for the standards each
            workplace expects, including <AcronymTooltip term="IICRC" /> continuing education.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          {/* Sector rail */}
          <div className="min-w-0">
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
              {SECTORS.map((sector, index) => {
                const Icon = sector.icon;
                const isActive = index === activeIndex;
                return (
                  <motion.li
                    key={sector.slug}
                    className="shrink-0 lg:shrink"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ ...spring, delay: Math.min(index * 0.04, 0.44) }}
                  >
                    <Link
                      href={`/industries/${sector.slug}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition duration-200 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none lg:w-full lg:rounded-xl lg:px-3 lg:py-2.5 ${
                        isActive
                          ? 'border-[#146fc2]/30 bg-[#eef5fb] font-semibold text-[#0f5fa8] lg:border-[#146fc2]/20 lg:shadow-[0_16px_34px_-26px_rgba(20,111,194,0.55)]'
                          : 'border-slate-200/90 bg-white font-medium text-slate-600 hover:text-[#146fc2] lg:border-transparent lg:bg-transparent lg:hover:bg-white'
                      }`}
                    >
                      <span
                        className={`hidden text-[11px] tracking-[0.08em] tabular-nums lg:block ${
                          isActive
                            ? 'text-[#2490ed]'
                            : 'text-slate-300 group-hover:text-[#2490ed]/60'
                        }`}
                        aria-hidden
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors lg:h-7 lg:w-7 lg:rounded-lg ${
                          isActive
                            ? 'bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_8px_16px_-8px_rgba(20,111,194,0.7)]'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-[#eef5fb] group-hover:text-[#146fc2]'
                        }`}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 lg:truncate">{sector.label}</span>
                      <ArrowRight
                        className={`ml-auto hidden h-3.5 w-3.5 shrink-0 transition lg:block ${
                          isActive
                            ? 'translate-x-0 text-[#146fc2] opacity-100'
                            : '-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                        }`}
                        aria-hidden
                      />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>

            <Link
              href="/industries"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none lg:mt-7 lg:ml-3"
            >
              View all industries
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* Live preview panel */}
          <motion.div
            className="relative lg:sticky lg:top-28 lg:self-start"
            initial={reduceMotion ? false : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...spring, stiffness: 95 }}
          >
            <div
              className="pointer-events-none absolute -inset-7 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.16),transparent_65%)] blur-2xl"
              aria-hidden
            />

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d5391] via-[#146fc2] to-[#1b7fd6] shadow-[0_48px_95px_-44px_rgba(20,111,194,0.7)]">
              {/* Top highlight hairline, corner sheen, and dot texture */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -top-24 right-[-12%] h-64 w-96 rounded-full bg-white/15 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_85%_75%_at_25%_15%,black,transparent)] opacity-[0.14]"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
                aria-hidden
              />

              <div className="relative min-h-[22rem] p-7 sm:min-h-[21rem] sm:p-9">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.slug}
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur-sm">
                        <ActiveIcon className="h-6 w-6 text-white" aria-hidden />
                      </span>
                      <span
                        className="font-[family-name:var(--font-display)] text-sm font-semibold text-white/45 tabular-nums"
                        aria-hidden
                      >
                        {String(activeIndex + 1).padStart(2, '0')} / {SECTORS.length}
                      </span>
                    </div>

                    <p className="mt-7 text-[10px] font-semibold tracking-[0.26em] text-white/55 uppercase">
                      Sector pathway
                    </p>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight font-semibold tracking-[-0.015em] text-white sm:text-[2rem]">
                      {active.label}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-[15px]">
                      {active.description}
                    </p>

                    <ul className="mt-6 flex flex-wrap gap-2">
                      {active.chips.map((chip) => (
                        <li
                          key={chip}
                          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/20"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/industries/${active.slug}`}
                      className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f5fa8] transition hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
                    >
                      View pathway
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
