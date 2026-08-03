'use client';

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { ArrowRight, BadgeCheck, Check, Play, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Serpentine journey path for desktop, in a 1000x1000 box stretched to the
 * journey area (preserveAspectRatio none, non-scaling stroke). Switchbacks
 * left and right past the four stations, ending at the proof node.
 */
const JOURNEY_PATH =
  'M 500 -10 C 500 30 300 30 300 80 C 300 170 700 220 700 310 C 700 400 300 440 300 530 C 300 620 700 670 700 760 C 700 850 500 880 500 940';

/** Animated hours read-out for the CEC ledger vignette. Counts up in view. */
function CecHoursCounter({ to }: { to: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useMotionValue(0);
  const display = useTransform(value, (v: number) => v.toFixed(1));

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(value, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.45,
    });
    return () => controls.stop();
  }, [inView, reduceMotion, to, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {reduceMotion ? to.toFixed(1) : <motion.span>{display}</motion.span>}
    </span>
  );
}

/** Station 01: a mini course search with filter chips and skeleton results. */
function SearchVignette() {
  return (
    <div className="w-[250px] max-w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.4)]">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-[#fafbfc] px-2.5 py-2">
        <Search className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-[11px] text-slate-700">mould remediation</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {['Discipline', 'Level', 'CEC hours'].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-500"
          >
            {chip}
          </span>
        ))}
        <span className="rounded-full border border-[#146fc2]/30 bg-[#eaf3fc] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2]">
          Free
        </span>
      </div>
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center gap-2">
            <span className="h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-[#eaf3fc] to-[#d5e8f9]" />
            <span className="min-w-0 flex-1">
              <span className="block h-1.5 w-4/5 rounded-full bg-slate-200" />
              <span className="mt-1 block h-1.5 w-3/5 rounded-full bg-slate-100" />
            </span>
            {row === 0 ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600">
                Free
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[9px] text-slate-400">24 courses match your filters</p>
    </div>
  );
}

/** Station 02: a tiny mobile lesson player mid-course. */
function PlayerVignette() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="w-[218px] max-w-full rounded-[1.35rem] border border-slate-200/90 bg-white p-3 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.4)]">
      <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
      <div className="relative mt-2.5 flex h-[76px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#10609f] via-[#146fc2] to-[#2490ed]">
        <span className="pointer-events-none absolute -top-6 left-1/2 h-16 w-28 -translate-x-1/2 rounded-full bg-white/20 blur-2xl" />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_18px_-6px_rgba(15,23,42,0.45)]">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-[#146fc2] text-[#146fc2]" />
        </span>
        <span className="absolute bottom-1.5 left-2 rounded bg-black/25 px-1.5 py-0.5 text-[7px] font-semibold tracking-[0.12em] text-white/90 uppercase">
          Module 2
        </span>
      </div>
      <p className="mt-2.5 truncate text-[11px] font-semibold text-slate-900">
        Structural drying essentials
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full w-[64%] origin-left rounded-full bg-gradient-to-r from-[#146fc2] to-[#2490ed]"
          initial={reduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
        <span>Lesson 4 of 7</span>
        <span className="tabular-nums">12 min left</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-[#146fc2]/20 bg-[#eaf3fc] px-2.5 py-1.5">
        <Play className="h-2.5 w-2.5 fill-[#146fc2] text-[#146fc2]" />
        <span className="text-[10px] font-semibold text-[#146fc2]">Resume lesson</span>
        <ArrowRight className="ml-auto h-2.5 w-2.5 text-[#146fc2]/70" />
      </div>
    </div>
  );
}

/** Station 03: a small CEC ledger with the hours counter ticking up. */
function LedgerVignette() {
  return (
    <div className="w-[250px] max-w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
          CEC record
        </span>
        <span className="rounded-full bg-[#eaf3fc] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2]">
          Up to date
        </span>
      </div>
      <p className="mt-2.5 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-[1.9rem] leading-none font-semibold tracking-[-0.02em] text-slate-950">
          <CecHoursCounter to={14} />
        </span>
        <span className="text-[10px] text-slate-400">hours logged</span>
      </p>
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
        {[
          { label: 'Logged 14 Jul', value: '4.0' },
          { label: 'Logged 2 Jun', value: '2.0' },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[10px]">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-2 w-2" />
            </span>
            <span className="shrink-0 text-slate-500">{row.label}</span>
            <span className="h-px min-w-4 flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="shrink-0 font-semibold text-slate-700 tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Station 04: a verified credential chip echoing the certificate exhibit. */
function CredentialVignette() {
  return (
    <div className="relative w-[250px] max-w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.4)]">
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#2490ed]/40 to-transparent" />
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_10px_20px_-8px_rgba(20,111,194,0.6)]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[8px] font-semibold tracking-[0.22em] text-slate-400 uppercase">
            CARSI designation
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug font-semibold text-slate-950">
            Water Restoration Practitioner
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
          <BadgeCheck className="h-2.5 w-2.5" />
          Verified
        </span>
        <span className="truncate text-[9px] text-slate-400 tabular-nums">
          carsi.au/verify/CRD-2481
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    step: '01',
    title: 'Browse by need',
    text: 'Search by discipline, level, CEC hours, free courses, or course outcome.',
    Vignette: SearchVignette,
  },
  {
    step: '02',
    title: 'Learn around jobs',
    text: 'Resume lessons whenever the roster allows, on desktop or mobile.',
    Vignette: PlayerVignette,
  },
  {
    step: '03',
    title: 'Track CECs',
    text: 'Keep progress and continuing education details visible in your dashboard.',
    Vignette: LedgerVignette,
  },
  {
    step: '04',
    title: 'Share credentials',
    text: 'Use certificates and verification pages for employers, clients, or renewal.',
    Vignette: CredentialVignette,
  },
] as const;

/**
 * The journey line. One continuous animated path switchbacks down the section
 * past four milestone stations, each pairing the step copy with a miniature
 * product vignette, and terminates at a proof node. Mobile collapses to a
 * simple vertical spine.
 */
export function HomeHowItWorksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-how-it-works-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Layered stage: two soft glows and a faint masked dot texture */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-8%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[-12%] left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.08),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_48%,black,transparent)] opacity-35">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,23,42,0.07) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>How it works</p>
          <h2 id="home-how-it-works-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Four steps from sign up to proof
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            No classrooms, no waiting lists. Pick a course tonight, study when the roster allows,
            and walk away with credentials your clients can check.
          </p>
          <Link
            href="/pathways"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
          >
            Browse structured pathways
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Journey area: serpentine path on desktop, vertical spine on mobile */}
        <div className="relative mt-16">
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="hiw-journey-stroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2490ed" stopOpacity="0.3" />
                <stop offset="0.5" stopColor="#2490ed" stopOpacity="0.6" />
                <stop offset="1" stopColor="#146fc2" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            {/* Faint dotted guide, visible before the line draws in */}
            <path
              d={JOURNEY_PATH}
              fill="none"
              stroke="rgba(148,163,184,0.4)"
              strokeWidth={1.25}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray="0.003 0.0085"
            />
            <motion.path
              d={JOURNEY_PATH}
              fill="none"
              stroke="url(#hiw-journey-stroke)"
              strokeWidth={1.75}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Traveling pulse along the drawn line */}
            {!reduceMotion && (
              <motion.path
                d={JOURNEY_PATH}
                fill="none"
                stroke="#2490ed"
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray="0.05 0.95"
                initial={{ strokeDashoffset: 1, opacity: 0 }}
                whileInView={{ strokeDashoffset: 0, opacity: 0.7 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  strokeDashoffset: { duration: 6, ease: 'linear', repeat: Infinity, delay: 2.4 },
                  opacity: { duration: 1.2, delay: 2.4 },
                }}
              />
            )}
          </svg>

          {/* Mobile spine */}
          <div
            className="absolute top-2 bottom-10 left-5 w-px bg-gradient-to-b from-slate-200 via-slate-300/80 to-transparent lg:hidden"
            aria-hidden
          />

          <ol className="relative flex flex-col gap-16 lg:gap-24">
            {STEPS.map((item, index) => {
              const { Vignette } = item;
              const isRight = index % 2 === 1;
              return (
                <motion.li
                  key={item.step}
                  className="relative lg:grid lg:grid-cols-2"
                  initial={reduceMotion ? false : { opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ ...spring, delay: index * 0.08 }}
                >
                  <div
                    className={`flex items-start gap-5 sm:gap-6 ${
                      isRight
                        ? 'lg:col-start-2 lg:flex-row-reverse lg:justify-self-end'
                        : 'lg:col-start-1 lg:justify-self-start'
                    }`}
                  >
                    <span
                      className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#146fc2]/50 bg-white font-[family-name:var(--font-display)] text-sm font-semibold text-[#146fc2] shadow-[0_10px_24px_-12px_rgba(20,111,194,0.45)] ring-4 ring-[#eaf3fc]/80"
                      aria-hidden
                    >
                      {item.step}
                    </span>
                    <div
                      className={`flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:gap-8 ${
                        isRight ? 'lg:flex-row-reverse' : ''
                      }`}
                    >
                      <div className={isRight ? 'lg:text-right' : ''}>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                          <span className="sr-only">Step {item.step}. </span>
                          {item.title}
                        </h3>
                        <p
                          className={`mt-2 max-w-xs text-sm leading-relaxed text-slate-500 ${
                            isRight ? 'lg:ml-auto' : ''
                          }`}
                        >
                          {item.text}
                        </p>
                      </div>
                      <motion.div
                        className="relative shrink-0"
                        aria-hidden
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 16 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ ...spring, delay: 0.15 + index * 0.08 }}
                      >
                        <Vignette />
                      </motion.div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {/* Terminal proof node, where the journey line ends */}
          <motion.div
            className="relative mt-16 flex items-center gap-5 sm:gap-6 lg:mt-24 lg:flex-col lg:gap-4 lg:text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ ...spring, delay: 0.2 }}
          >
            <span
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_18px_36px_-14px_rgba(20,111,194,0.55)] ring-4 ring-[#eaf3fc] lg:h-14 lg:w-14"
              aria-hidden
            >
              <BadgeCheck className="h-4 w-4 lg:h-6 lg:w-6" />
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                Proof in hand
              </p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
                A verified record of your training, ready to share.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
