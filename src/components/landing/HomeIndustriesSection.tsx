'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
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

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

const INDUSTRIES = [
  { slug: 'healthcare', label: 'Healthcare', icon: HeartPulse },
  { slug: 'hospitality', label: 'Hotels & Resorts', icon: Hotel },
  { slug: 'government-defence', label: 'Government & Defence', icon: Landmark },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning', icon: Sparkles },
  { slug: 'aged-care', label: 'Aged Care', icon: HandHeart },
  { slug: 'mining', label: 'Mining & Resources', icon: Pickaxe },
  { slug: 'education', label: 'Education', icon: GraduationCap },
  { slug: 'property-management', label: 'Property Management', icon: KeyRound },
  { slug: 'strata', label: 'Strata & Body Corporate', icon: Building2 },
  { slug: 'retail', label: 'Retail & Shopping Centres', icon: ShoppingBag },
  { slug: 'childcare', label: 'Childcare', icon: Baby },
  { slug: 'construction', label: 'Construction', icon: HardHat },
] as const;

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Sector coverage board. A dense hairline grid of twelve indexed cells, each a
 * sector pathway with icon and reveal arrow; hovering tints a cell brand blue
 * and lifts it above the board. A deep blue footer rail carries the CTA.
 */
export function HomeIndustriesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-industries-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Soft glow band behind the board plus a faint masked grid texture */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[52%] left-1/2 h-[26rem] w-[76rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-[70px]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_60%,black,transparent)] opacity-30">
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
          <p className={LANDING_EYEBROW_CLASS}>Industries</p>
          <h2 id="home-industries-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Trained for every sector you serve
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            From hospitals to hotels, sector-specific pathways prepare crews for the standards each
            workplace expects, including <AcronymTooltip term="IICRC" /> continuing education.
          </p>
        </div>

        {/* Coverage board */}
        <ul className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-200/70 shadow-[0_32px_70px_-52px_rgba(15,23,42,0.45)] sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRIES.map((industry, index) => {
            const Icon = industry.icon;
            const numeral = String(index + 1).padStart(2, '0');
            return (
              <motion.li
                key={industry.slug}
                className="min-w-0"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...spring, delay: Math.min(index * 0.045, 0.5) }}
              >
                <Link
                  href={`/industries/${industry.slug}`}
                  className="group relative flex h-full min-h-[9.5rem] flex-col justify-between gap-8 bg-white p-5 transition duration-300 hover:z-10 hover:bg-gradient-to-br hover:from-[#146fc2] hover:to-[#2490ed] hover:shadow-[0_28px_55px_-24px_rgba(20,111,194,0.6)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none focus-visible:ring-inset motion-safe:hover:scale-[1.03] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="text-[11px] font-medium tracking-[0.14em] text-slate-300 tabular-nums transition-colors group-hover:text-white/50"
                      aria-hidden
                    >
                      {numeral}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 -translate-x-1 translate-y-1 text-white/0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-white group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:text-[#146fc2]"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <Icon
                      className="h-5 w-5 text-[#146fc2] transition-colors group-hover:text-white"
                      aria-hidden
                    />
                    <span className="mt-3 block font-[family-name:var(--font-display)] text-[15px] leading-snug font-semibold tracking-[-0.01em] text-slate-900 transition-colors group-hover:text-white">
                      {industry.label}
                    </span>
                  </div>
                </Link>
              </motion.li>
            );
          })}

          {/* CTA footer rail */}
          <motion.li
            className="col-span-2 sm:col-span-3 lg:col-span-4"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...spring, delay: 0.55 }}
          >
            <Link
              href="/industries"
              className="group relative flex items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-[#10609f] via-[#146fc2] to-[#1b7fd6] px-5 py-6 text-white transition focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none focus-visible:ring-inset sm:px-8"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute -top-14 right-[12%] h-36 w-64 rounded-full bg-white/15 blur-3xl"
                aria-hidden
              />
              <span className="relative min-w-0">
                <span className="block text-[11px] font-medium tracking-[0.2em] text-white/60 uppercase">
                  12 sector pathways
                </span>
                <span className="mt-1 block font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em]">
                  View all industries
                </span>
              </span>
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition group-hover:bg-white group-hover:text-[#146fc2]">
                <ArrowRight
                  className="h-4.5 w-4.5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </motion.li>
        </ul>
      </div>
    </section>
  );
}
