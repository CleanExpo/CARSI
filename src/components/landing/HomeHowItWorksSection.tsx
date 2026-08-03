'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCheck,
  Clock,
  Copy,
  Play,
  Search,
  Share2,
  ShieldCheck,
  UserPlus,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/** Deterministic bar heights for the CEC mini chart, as percentages. */
const CEC_CHART_BARS = [34, 52, 28, 60, 44, 70, 56, 88];

const SEARCH_CHIPS = [
  { label: 'Water restoration', active: true },
  { label: 'Foundation', active: false },
  { label: 'CEC hours', active: true },
  { label: 'Free courses', active: false },
] as const;

const RAIL_STEPS = [
  { label: 'Enrol', Icon: UserPlus },
  { label: 'Learn', Icon: BookOpen },
  { label: 'Quiz', Icon: ClipboardCheck },
  { label: 'Earn XP', Icon: Zap },
  { label: 'Certificate', Icon: Award },
  { label: 'Share', Icon: Share2 },
] as const;

/* ------------------------------------------------------------------ */
/* Miniature product vignettes, one believable UI artefact per moment  */
/* ------------------------------------------------------------------ */

function VignetteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-[0_36px_70px_-40px_rgba(15,23,42,0.4)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}

/** 01. Compact catalogue search card with filter chips and a result row. */
function SearchVignette({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <VignetteShell>
      <div className="w-[280px] p-4 sm:w-[330px]">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-[#fafbfc] px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="text-xs text-slate-700">structural drying</span>
          <motion.span
            className="h-3.5 w-px bg-[#2490ed]"
            aria-hidden
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={reduceMotion ? { opacity: 0 } : { opacity: [0, 1, 1, 0] }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.1, repeat: 3, delay: 0.4 }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SEARCH_CHIPS.map((chip, index) => (
            <motion.span
              key={chip.label}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                chip.active
                  ? 'border-[#146fc2]/35 bg-[#eef5fb] text-[#146fc2]'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...spring, delay: 0.35 + index * 0.09 }}
            >
              {chip.label}
            </motion.span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200/80 p-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_10px_20px_-10px_rgba(20,111,194,0.7)]"
            aria-hidden
          >
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-slate-900">
              Structural Drying Fundamentals
            </span>
            <span className="block text-[10px] text-slate-400">Water restoration · Self paced</span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
          <span>Course catalogue</span>
          <span className="font-semibold text-[#146fc2]">2 filters on</span>
        </div>
      </div>
    </VignetteShell>
  );
}

/** 02. Mobile lesson player with a filling progress bar and resume state. */
function LessonVignette({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <VignetteShell>
      <div className="w-[270px] p-4 sm:w-[300px]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white tabular-nums">
            <Clock className="h-3 w-3 text-[#7cbcf2]" aria-hidden />
            7:42 pm
          </span>
          <span className="text-[10px] text-slate-400">Lesson 4 of 9</span>
        </div>

        <p className="mt-3.5 text-[13px] font-semibold text-slate-900">Psychrometry on the job</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Module 2 · Drying science</p>

        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full w-[64%] origin-left rounded-full bg-gradient-to-r from-[#146fc2] to-[#2490ed]"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
          <span>64% complete</span>
          <span>18 min left</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#146fc2] py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-14px_rgba(20,111,194,0.75)]">
          <Play className="h-3 w-3 fill-current" aria-hidden />
          Resume lesson
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          Synced across desktop and mobile
        </p>
      </div>
    </VignetteShell>
  );
}

/** 03. CEC dashboard tile with logged hours and a growing mini chart. */
function CecVignette({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <VignetteShell>
      <div className="w-[280px] p-4 sm:w-[320px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            CEC record
          </span>
          <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
            Up to date
          </span>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
            18.0
          </span>
          <span className="text-xs text-slate-400">CEC hours logged</span>
        </div>

        <motion.span
          className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-[#146fc2]/30 bg-[#eef5fb] px-2 py-0.5 text-[9px] font-semibold text-[#146fc2] tabular-nums"
          initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.85 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ ...spring, delay: 0.75 }}
        >
          <Zap className="h-2.5 w-2.5" aria-hidden />
          +1.0 logged tonight
        </motion.span>

        <div className="mt-4 flex h-14 items-end gap-1.5" aria-hidden>
          {CEC_CHART_BARS.map((height, index) => (
            <motion.span
              key={index}
              className={`flex-1 origin-bottom rounded-t-sm ${
                index === CEC_CHART_BARS.length - 1
                  ? 'bg-gradient-to-t from-[#146fc2] to-[#2490ed]'
                  : 'bg-slate-200/80'
              }`}
              style={{ height: `${height}%` }}
              initial={reduceMotion ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...spring, delay: 0.3 + index * 0.07 }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] tracking-[0.12em] text-slate-400 uppercase">
          <span>Last 8 weeks</span>
          <span>Your dashboard</span>
        </div>
      </div>
    </VignetteShell>
  );
}

/** 04. Shareable credential chip with verified tick and copy-link row. */
function ShareVignette({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <VignetteShell>
      <div className="w-[280px] p-4 sm:w-[330px]">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_10px_20px_-10px_rgba(20,111,194,0.7)]"
            aria-hidden
          >
            <Award className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs leading-snug font-semibold text-slate-900">
              CARSI Water Restoration Practitioner
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400 tabular-nums">
              Issued 12 Aug 2026 · ID CRD-2481
            </span>
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-[#fafbfc] px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600 tabular-nums">
            carsi.au/verify/CRD-2481
          </span>
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
            aria-hidden
          >
            <Copy className="h-3 w-3" />
          </span>
        </div>

        <p className="mt-3 text-[10px] text-slate-400">
          Employers and clients can check it any time.
        </p>

        {/* Verified tick springs onto the corner, stamp style */}
        <motion.span
          className="absolute -top-3 -right-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-[0_14px_28px_-14px_rgba(16,145,90,0.55)]"
          initial={reduceMotion ? false : { opacity: 0, scale: 1.6, rotate: -12 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 4 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.6 }}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Verified
        </motion.span>
      </div>
    </VignetteShell>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    step: '01',
    time: '6:48 pm',
    title: 'Browse by need',
    text: 'Search by discipline, level, CEC hours, free courses, or course outcome.',
    Vignette: SearchVignette,
  },
  {
    step: '02',
    time: '7:42 pm',
    title: 'Learn around jobs',
    text: 'Resume lessons whenever the roster allows, on desktop or mobile.',
    Vignette: LessonVignette,
  },
  {
    step: '03',
    time: '8:55 pm',
    title: 'Track CECs',
    text: 'Keep progress and continuing education details visible in your dashboard.',
    Vignette: CecVignette,
  },
  {
    step: '04',
    time: '9:10 pm',
    title: 'Share credentials',
    text: 'Use certificates and verification pages for employers, clients, or renewal.',
    Vignette: ShareVignette,
  },
] as const;

/**
 * "One evening, four moments." The four steps run down a scroll-drawn spine
 * as moments in a technician's evening, alternating left and right on desktop.
 * Each moment pairs a ghost numeral and time chip with a miniature product
 * vignette: catalogue search, lesson player, CEC tile, shareable credential.
 * A six-node journey rail closes the section.
 */
export function HomeHowItWorksSection() {
  const reduceMotion = useReducedMotion() ?? false;
  const spineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: spineRef,
    offset: ['start 0.8', 'end 0.55'],
  });
  const spineDraw = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  return (
    <section
      aria-labelledby="home-how-it-works-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      {/* Evening stage: two soft glows and a faint masked dot texture */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[6%] left-[-10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute right-[-8%] bottom-[8%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.09),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_55%_60%_at_50%_45%,black,transparent)] opacity-35">
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

        {/* The evening spine */}
        <div ref={spineRef} className="relative mt-24 lg:mt-28">
          <div
            className="absolute top-0 bottom-0 left-[15px] lg:left-1/2 lg:-translate-x-1/2"
            aria-hidden
          >
            <div className="absolute inset-y-0 left-0 border-l border-dashed border-slate-300/70" />
            <motion.div
              className="absolute inset-y-0 left-[-1px] w-[2px] origin-top rounded-full bg-gradient-to-b from-[#2490ed] via-[#2490ed]/55 to-[#2490ed]/15"
              style={{ scaleY: reduceMotion ? 1 : spineDraw }}
            />
          </div>

          {/* Narrative caption at the head of the spine */}
          <motion.p
            className="absolute -top-12 left-[15px] z-10 -translate-x-1/2 lg:left-1/2"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={spring}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[9px] font-semibold tracking-[0.2em] whitespace-nowrap text-slate-500 uppercase shadow-sm">
              <Clock className="h-3 w-3 text-[#2490ed]" aria-hidden />
              One evening, four moments
            </span>
          </motion.p>

          <ol className="space-y-16 lg:space-y-24">
            {STEPS.map((item, index) => {
              const flip = index % 2 === 1;
              const Vignette = item.Vignette;
              return (
                <li key={item.step} className="relative pl-12 sm:pl-14 lg:pl-0">
                  {/* Node on the spine */}
                  <motion.span
                    className="absolute top-1 left-[15px] z-10 -translate-x-1/2 lg:top-8 lg:left-1/2"
                    aria-hidden
                    initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ ...spring, delay: 0.2 }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#2490ed]/45 bg-white shadow-[0_0_0_5px_rgba(36,144,237,0.10)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" />
                    </span>
                  </motion.span>

                  <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-x-24">
                    {/* Words */}
                    <motion.div
                      className={`relative ${
                        flip
                          ? 'lg:col-start-2 lg:row-start-1'
                          : 'lg:col-start-1 lg:row-start-1 lg:text-right'
                      }`}
                      initial={reduceMotion ? false : { opacity: 0, x: flip ? 22 : -22 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.45 }}
                      transition={{ ...spring, delay: 0.1 }}
                    >
                      {/* Ghost numeral anchor */}
                      <span
                        className={`pointer-events-none absolute -top-9 font-[family-name:var(--font-display)] text-[4rem] leading-none font-semibold tracking-[-0.04em] text-[#146fc2]/[0.08] select-none lg:-top-14 lg:text-[5.75rem] ${
                          flip ? 'left-0 lg:-left-2' : 'left-0 lg:right-0 lg:left-auto'
                        }`}
                        aria-hidden
                      >
                        {item.step}
                      </span>

                      <span className="relative inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase tabular-nums shadow-sm">
                        <Clock className="h-3 w-3 text-[#2490ed]" aria-hidden />
                        {item.time}
                      </span>
                      <h3 className="relative mt-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.01em] text-slate-950 lg:text-[1.4rem]">
                        <span className="sr-only">Step {item.step}. </span>
                        {item.title}
                      </h3>
                      <p
                        className={`relative mt-2 max-w-sm text-sm leading-relaxed text-slate-500 ${
                          flip ? '' : 'lg:ml-auto'
                        }`}
                      >
                        {item.text}
                      </p>
                    </motion.div>

                    {/* Vignette */}
                    <motion.div
                      className={`relative ${
                        flip
                          ? 'lg:col-start-1 lg:row-start-1 lg:justify-self-end'
                          : 'lg:col-start-2 lg:row-start-1 lg:justify-self-start'
                      }`}
                      initial={reduceMotion ? false : { opacity: 0, y: 26, rotate: flip ? -3 : 3 }}
                      whileInView={{ opacity: 1, y: 0, rotate: flip ? 1.25 : -1.25 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ ...spring, stiffness: 90, delay: 0.18 }}
                    >
                      <div
                        className="pointer-events-none absolute -inset-7 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.12),transparent_65%)] blur-2xl"
                        aria-hidden
                      />
                      <Vignette reduceMotion={reduceMotion} />
                    </motion.div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Six-step journey rail */}
        <div className="mt-20 lg:mt-24">
          <p className="text-center text-xs text-slate-400">
            From enrolment to credential. Six steps to recognised professional development.
          </p>

          <div className="relative mx-auto mt-8 max-w-3xl px-1 sm:px-4">
            <div
              className="absolute top-[17px] right-8 left-8 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent"
              aria-hidden
            />
            {reduceMotion ? null : (
              <motion.span
                className="absolute top-[17px] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2490ed] shadow-[0_0_10px_2px_rgba(36,144,237,0.45)]"
                aria-hidden
                animate={{ left: ['7%', '93%'], opacity: [0, 1, 1, 1, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            <ol className="relative flex items-start justify-between">
              {RAIL_STEPS.map((railStep, index) => (
                <motion.li
                  key={railStep.label}
                  className="flex flex-col items-center gap-2"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ ...spring, delay: index * 0.08 }}
                >
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-sm">
                    <railStep.Icon className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
                  </span>
                  <span className="text-[9px] font-medium whitespace-nowrap text-slate-500 sm:text-[10px]">
                    {railStep.label}
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
