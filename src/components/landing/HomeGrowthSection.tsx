'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarDays, Flag, MapPin } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwWorkshopHref, homePathwayItems } from '@/lib/marketing/home-pathways';

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/** Bar widths for the fake barcode, in px. Deterministic so SSR matches client. */
const BARCODE_BARS = [
  2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 1, 1, 3, 2, 4, 1, 2, 1, 1, 3, 2, 1,
];

/** 7x7 pseudo QR pattern for the tear-off stub. */
const QR_PATTERN = [
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 1, 0],
  [1, 1, 1, 0, 1, 0, 1],
];

const TOUR_DATES = [
  { city: 'Melbourne', dates: '22 to 23 Jul' },
  { city: 'Sydney', dates: '30 to 31 Jul' },
] as const;

/**
 * Growth Days departures. The centrepiece is a life-like event ticket for the
 * CARSI x CCW Business Growth Days, with a tear-off check-in stub, barcode and
 * a stamped in-person mark. The three pathways sit beside it as boarding rows,
 * and the workshop hangs off the end as a small dashed stub.
 */
export function HomeGrowthSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      {/* Dual-tone stage: blue for online study, warm amber for in person */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-12%] left-[-8%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute right-[-10%] bottom-[-16%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(237,157,36,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_55%_50%_at_38%_60%,black,transparent)] opacity-40">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,23,42,0.07) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />
        </div>
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>Beyond the catalogue</p>
          <h2 id="home-growth-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Learn online. Grow in person.
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            Self-paced courses are the start, not the ceiling. When you are ready to grow the
            business, join CARSI and CCW Business Growth Days in person.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
          {/* The Growth Days ticket */}
          <motion.div
            className="relative mx-auto w-full max-w-[560px]"
            initial={reduceMotion ? false : { opacity: 0, y: 30, rotate: 1.75 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1.25 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ ...spring, stiffness: 90 }}
          >
            <div
              className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(237,157,36,0.12),transparent_65%)] blur-2xl"
              aria-hidden
            />

            <div className="relative flex overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)]">
              {/* Ticket body */}
              <div className="min-w-0 flex-1 px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#146fc2] text-[10px] font-bold text-white"
                      aria-hidden
                    >
                      C
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.02em] text-slate-900">
                      CARSI <span className="font-normal text-slate-400">×</span> CCW
                    </span>
                  </div>
                  <span className="rounded-full border border-[#ed9d24]/35 bg-[#fff8ef] px-2.5 py-1 text-[9px] font-semibold tracking-[0.14em] text-[#a85500] uppercase">
                    Live event
                  </span>
                </div>

                <p className="mt-5 text-[9px] font-semibold tracking-[0.32em] text-slate-400 uppercase">
                  Event pass · 2026 circuit
                </p>
                <p className="mt-1.5 font-[family-name:var(--font-display)] text-[1.55rem] leading-tight font-semibold tracking-[-0.015em] text-slate-950 sm:text-[1.8rem]">
                  Business Growth Days
                </p>

                <div className="mt-5 space-y-2.5">
                  {TOUR_DATES.map((stop) => (
                    <div
                      key={stop.city}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <MapPin className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
                        {stop.city}
                      </span>
                      <span
                        className="h-px min-w-6 flex-1 bg-gradient-to-r from-slate-200 via-slate-200 to-transparent"
                        aria-hidden
                      />
                      <span className="flex items-center gap-1.5 text-slate-500 tabular-nums">
                        <CalendarDays className="h-3.5 w-3.5 text-[#ed9d24]" aria-hidden />
                        {stop.dates}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-5 h-px w-full bg-gradient-to-r from-slate-200 via-slate-200/60 to-transparent"
                  aria-hidden
                />

                <p className="mt-4 text-[11px] text-slate-500">
                  Admit one · Free entry for CCW customers
                </p>

                {/* Barcode */}
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div className="flex h-9 items-end gap-[3px]" aria-hidden>
                    {BARCODE_BARS.map((width, index) => (
                      <motion.span
                        key={index}
                        className="h-full origin-bottom bg-slate-800"
                        style={{ width }}
                        initial={reduceMotion ? false : { scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.35 + index * 0.018,
                        }}
                      />
                    ))}
                  </div>
                  <span className="pb-0.5 text-[9px] tracking-[0.18em] text-slate-400 uppercase tabular-nums">
                    No. GD-2607-AU
                  </span>
                </div>
              </div>

              {/* Perforation with punched notches, clipped by the ticket edge */}
              <div className="relative w-0 border-l border-dashed border-slate-300" aria-hidden>
                <span className="absolute -top-3 left-0 h-6 w-6 -translate-x-1/2 rounded-full border border-slate-200/90 bg-white shadow-[inset_0_-2px_4px_rgba(15,23,42,0.05)]" />
                <span className="absolute -bottom-3 left-0 h-6 w-6 -translate-x-1/2 rounded-full border border-slate-200/90 bg-white shadow-[inset_0_2px_4px_rgba(15,23,42,0.05)]" />
              </div>

              {/* Tear-off stub */}
              <div className="flex w-[104px] shrink-0 flex-col items-center justify-between gap-4 bg-[#fafbfc] px-3 py-6 sm:w-[124px] sm:px-4">
                <span className="rounded-full border border-[#146fc2]/25 bg-[#eef5fb] px-2 py-1 text-center text-[8px] leading-tight font-semibold tracking-[0.12em] text-[#146fc2] uppercase">
                  Check-in token
                </span>

                <div
                  className="grid grid-cols-7 gap-[2px] rounded-md border border-slate-200/80 bg-white p-1.5"
                  aria-hidden
                >
                  {QR_PATTERN.flat().map((cell, index) => (
                    <span
                      key={index}
                      className={`h-[5px] w-[5px] rounded-[1px] ${cell ? 'bg-slate-800' : 'bg-transparent'}`}
                    />
                  ))}
                </div>

                <span
                  className="text-[9px] font-semibold tracking-[0.34em] text-slate-400 uppercase [writing-mode:vertical-rl]"
                  aria-hidden
                >
                  Admit one
                </span>
              </div>
            </div>

            {/* Rubber-stamped in-person mark */}
            <motion.div
              className="absolute -top-4 right-6 sm:right-8"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.7, rotate: 4 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.7 }}
            >
              <span className="inline-block rounded-md border-2 border-[#ed9d24]/55 bg-white/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#c97b0a] uppercase shadow-[0_14px_28px_-16px_rgba(237,157,36,0.55)] backdrop-blur-sm">
                In person
              </span>
            </motion.div>
          </motion.div>

          {/* Pathways as boarding rows */}
          <div>
            <ol className="divide-y divide-slate-100">
              {homePathwayItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.href}
                    initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ ...spring, delay: 0.15 + index * 0.12 }}
                  >
                    <Link
                      href={item.href}
                      className={`group -mx-4 flex items-start gap-4 rounded-2xl border border-transparent px-4 py-5 transition hover:bg-white hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none sm:gap-5 ${item.borderHoverClass}`}
                    >
                      <span
                        className="mt-1 font-[family-name:var(--font-display)] text-[1.35rem] leading-none font-semibold text-[#2490ed]/30 tabular-nums select-none"
                        aria-hidden
                      >
                        0{index + 1}
                      </span>
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-sm">
                        <Icon className={`h-4 w-4 ${item.accentClass}`} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                            {item.label}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#146fc2] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                            {item.cta}
                            <ArrowRight
                              className="h-3 w-3 transition group-hover:translate-x-0.5"
                              aria-hidden
                            />
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
            </ol>

            {/* Workshop: the small stub at the end of the circuit */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ ...spring, delay: 0.55 }}
            >
              <Link
                href={ccwWorkshopHref}
                className="group mt-7 inline-flex max-w-full items-center gap-3.5 rounded-xl border border-dashed border-[#ed9d24]/50 bg-[#fff8ef] py-3 pr-4 pl-3.5 transition hover:border-[#ed9d24]/80 hover:bg-[#fff3e0] focus-visible:ring-2 focus-visible:ring-[#ed9d24]/45 focus-visible:outline-none"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ed9d24] to-[#c97b0a] text-white shadow-[0_10px_20px_-10px_rgba(237,157,36,0.7)]">
                  <Flag className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-semibold tracking-[0.16em] text-[#a85500]/80 uppercase">
                    Also on the circuit
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#a85500]">
                    2-Day Carpet Cleaning Workshop
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#a85500] transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
