'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flag } from 'lucide-react';
import Link from 'next/link';

import { GrowthPathInfographic } from '@/components/landing/GrowthPathInfographic';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwWorkshopHref, homePathwayItems } from '@/lib/marketing/home-pathways';

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Growth itinerary. A vertical route line runs from online study to in-person
 * events; each pathway is a station on the route, ending at the workshop flag.
 * The infographic sits beside it as the map.
 */
export function HomeGrowthSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-white"
    >
      {/* Dual-tone stage: blue for online, warm amber for in person */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-10%] left-[-8%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute right-[-10%] bottom-[-14%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(237,157,36,0.10),transparent_70%)] blur-2xl" />
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
        <div className="grid gap-14 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div
              className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.08),transparent_70%)] blur-xl"
              aria-hidden
            />
            <div className="relative">
              <GrowthPathInfographic />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className={LANDING_EYEBROW_CLASS}>Beyond the catalogue</p>
            <h2 id="home-growth-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Learn online. Grow in person.
            </h2>
            <p className={`mt-4 max-w-md ${LANDING_LEAD_CLASS}`}>
              Self-paced courses are the start, not the ceiling. When you are ready to grow the
              business, join CARSI and CCW Business Growth Days in person.
            </p>

            {/* Route: vertical line with stations */}
            <ol className="relative mt-10">
              <motion.span
                className="absolute top-3 bottom-8 left-[13px] w-px origin-top bg-gradient-to-b from-[#2490ed]/60 via-slate-200 to-[#ed9d24]/60"
                initial={reduceMotion ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
              />

              {homePathwayItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.href}
                    initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ ...spring, delay: 0.15 + index * 0.12 }}
                  >
                    <Link
                      href={item.href}
                      className="group relative flex items-start gap-5 rounded-2xl py-4 pr-3 pl-0 transition focus-visible:outline-none"
                    >
                      <span className="relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition group-hover:border-[#2490ed]/50 group-focus-visible:border-[#2490ed]/60">
                        <Icon className={`h-3.5 w-3.5 ${item.accentClass}`} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 border-b border-slate-100 pb-4 transition group-last:border-b-0 group-hover:border-[#2490ed]/25">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                            {item.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#146fc2] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                            {item.cta}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </span>
                        </span>
                        <span className="mt-1 block font-[family-name:var(--font-display)] text-[15px] font-semibold text-slate-950 transition group-hover:text-[#146fc2]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500">{item.detail}</span>
                      </span>
                      <span className="sr-only">
                        Pathway {index + 1} of {homePathwayItems.length}
                      </span>
                    </Link>
                  </motion.li>
                );
              })}

              {/* Final destination */}
              <motion.li
                initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...spring, delay: 0.55 }}
              >
                <Link
                  href={ccwWorkshopHref}
                  className="group relative mt-1 flex items-center gap-5 focus-visible:outline-none"
                >
                  <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ed9d24] to-[#c97b0a] text-white shadow-[0_10px_20px_-10px_rgba(237,157,36,0.7)]">
                    <Flag className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition group-hover:text-[#a85500]">
                    2-Day Carpet Cleaning Workshop
                    <ArrowRight
                      className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </motion.li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
