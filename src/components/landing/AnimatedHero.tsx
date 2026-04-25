'use client';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  CheckCircle,
  Circle,
  Clock,
  Headphones,
  Play,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

// ---------------------------------------------------------------------------
// Hero visuals (CSS-only — no external images)
// ---------------------------------------------------------------------------

function HeroMeshBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]" aria-hidden>
      <div
        className="absolute -top-[45%] left-1/2 h-[130%] w-[155%] -translate-x-1/2"
        style={{
          background: `
            radial-gradient(ellipse 50% 38% at 72% 18%, rgba(36, 144, 237, 0.28), transparent 58%),
            radial-gradient(ellipse 42% 34% at 12% 55%, rgba(0, 212, 170, 0.1), transparent 52%),
            radial-gradient(ellipse 38% 42% at 92% 78%, rgba(237, 157, 36, 0.09), transparent 48%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 78% 72% at 52% 42%, black 12%, transparent 72%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 78% 72% at 52% 42%, black 12%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.11]"
      style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

function CatalogSearchCue() {
  return (
    <motion.div variants={fadeInUp} transition={{ duration: 0.55, ease: smoothEase }}>
      <Link
        href="/courses"
        className="group flex max-w-xl items-center gap-3 rounded-xl border border-white/[0.1] bg-[#080c14]/80 px-4 py-3.5 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 hover:border-[#2490ed]/35 hover:bg-[#0a101c]/90 hover:shadow-[0_16px_48px_-24px_rgba(36,144,237,0.35)]"
      >
        <Search className="h-5 w-5 shrink-0 text-[#2490ed]/70 transition-colors group-hover:text-[#2490ed]" />
        <span className="text-sm text-white/45 transition-colors group-hover:text-white/55">
          Search the catalogue — courses, disciplines, CEC hours…
        </span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-[#2490ed]/80" />
      </Link>
    </motion.div>
  );
}

function HeroPreviewConnector() {
  return (
    <svg
      className="pointer-events-none absolute top-[52%] left-[8%] z-[1] hidden h-32 w-24 text-[#2490ed]/25 lg:block"
      viewBox="0 0 96 128"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 8 C 32 8, 40 48, 52 72 S 72 112, 88 120"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="8" cy="8" r="3" className="fill-[#2490ed]/40" />
    </svg>
  );
}

function HeroLearningPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,560px)] lg:mr-0 lg:ml-auto">
      {/* Stage frame — anchors the whole column */}
      <div className="relative overflow-visible rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-white/[0.06] via-[#070b14]/40 to-[#04060c] p-4 shadow-[0_32px_100px_-40px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_1px_rgba(36,144,237,0.12)]" />
        <HeroMeshBackdrop />

        {/* Eyebrow + live affordance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: smoothEase }}
          className="relative z-[2] mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-emerald-200/95">
            <span className="relative flex h-2 w-2">
              {!reduceMotion ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
              ) : null}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Your learning workspace
          </div>
          <p className="text-[11px] text-white/35 sm:text-right">
            <span className="text-white/50">Resume-ready</span> · Est. 12 min to next milestone
          </p>
        </motion.div>

        <div className="relative z-[2] min-h-[320px] sm:min-h-[340px]">
          <HeroPreviewConnector />

          {/* Back card — pathway stack (bento accent) */}
          <motion.div
            initial={{ opacity: 0, x: 36, rotate: -5 }}
            animate={{ opacity: 1, x: 0, rotate: -5 }}
            transition={{ duration: 0.65, ease: smoothEase, delay: 0.15 }}
            className="absolute top-0 right-0 z-[1] w-[min(100%,94%)] rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-4 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md sm:w-[88%]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-white/40 uppercase">
                Pathway progress
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2490ed]/15 px-2 py-0.5 font-mono text-[10px] text-[#7ec5ff]">
                <TrendingUp className="h-3 w-3" />
                IICRC CEC
              </span>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/90" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-white/75">
                      Water damage — fundamentals
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-white/35">Done</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#2490ed] shadow-[0_0_0_3px_rgba(36,144,237,0.25)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-white/85">
                      Psychrometry & drying
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-[#7ec5ff]">62%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#2490ed] to-[#38a8ff]"
                      initial={{ width: reduceMotion ? '62%' : '0%' }}
                      animate={{ width: '62%' }}
                      transition={{ duration: reduceMotion ? 0 : 1.1, ease: smoothEase, delay: 0.5 }}
                    />
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5 opacity-55">
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-white/50">Odour control — unlocks next</span>
                </div>
              </li>
            </ul>
          </motion.div>

          {/* Front card — lesson player */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: smoothEase, delay: 0.28 }}
            whileHover={reduceMotion ? undefined : { scale: 1.008 }}
            className="relative z-[2] mt-[5.5rem] rounded-2xl bg-gradient-to-br from-[#2490ed]/45 via-[#0a1628] to-[#ed9d24]/25 p-[3px] shadow-[0_36px_90px_-36px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:mt-[6rem]"
          >
            <div className="overflow-hidden rounded-[13px] border border-white/[0.08] bg-[#060a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="relative aspect-video bg-gradient-to-br from-[#1c2d48] via-[#0e1829] to-[#060a12]">
                {/* Corner brackets */}
                <div
                  className="pointer-events-none absolute top-3 left-3 h-6 w-6 border-t border-l border-white/20"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute top-3 right-3 h-6 w-6 border-t border-r border-white/20"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute bottom-10 left-3 h-6 w-6 border-b border-l border-white/15"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute right-3 bottom-10 h-6 w-6 border-b border-r border-white/15"
                  aria-hidden
                />

                <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_100%,rgba(36,144,237,0.28),transparent_58%)]" />

                {/* Mini “lesson timeline” */}
                <div className="absolute top-3 right-3 left-3 flex gap-1">
                  {[0.35, 0.55, 0.25, 0.7, 0.4].map((h, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-black/35"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full bg-white/25"
                        style={{ width: `${Math.round(h * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-[5rem] sm:w-[5rem]">
                    <svg
                      className="absolute inset-0 -rotate-90 text-[#2490ed]/85"
                      viewBox="0 0 100 100"
                      aria-hidden
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-white/10"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={289.03}
                        initial={{ strokeDashoffset: 289.03 }}
                        animate={{ strokeDashoffset: 289.03 * (1 - 0.38) }}
                        transition={{ duration: reduceMotion ? 0 : 1.25, ease: smoothEase, delay: 0.65 }}
                      />
                    </svg>
                    <motion.div
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              scale: [1, 1.06, 1],
                            }
                      }
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/[0.12] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md sm:h-16 sm:w-16"
                    >
                      <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" />
                    </motion.div>
                  </div>
                </div>

                <div className="absolute right-3 bottom-3 left-3">
                  <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-black/45">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#2490ed] to-[#5eb3ff]"
                      initial={{ width: '0%' }}
                      animate={{ width: '38%' }}
                      transition={{ duration: reduceMotion ? 0 : 1.15, ease: smoothEase, delay: 0.75 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] tabular-nums text-white/50">
                    <span>12:04</span>
                    <span>31:20</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.07] bg-[#070b14]/95 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#2490ed]/90 uppercase">
                      Now learning
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
                      Psychrometry & drying science — module assessment prep
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#ed9d24]/25 bg-[#ed9d24]/10 px-2 py-1 text-[10px] font-semibold text-[#f0c06a]">
                    In progress
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">
                    <Clock className="h-3 w-3" />
                    Self-paced
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300/90">
                    <Sparkles className="h-3 w-3" />
                    CEC eligible
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/40">
                    <Headphones className="h-3 w-3" />
                    Audio + captions
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating metrics — intentional arc */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: smoothEase, delay: 0.55 }}
            className="relative z-[3] mt-4 grid grid-cols-3 gap-2 sm:gap-3"
          >
            <div className="rounded-xl border border-white/10 bg-[#0a0f18]/90 px-2.5 py-2.5 text-center shadow-lg backdrop-blur-md sm:px-3 sm:py-3">
              <p className="font-mono text-base font-bold tabular-nums text-white sm:text-lg">24/7</p>
              <p className="text-[8px] tracking-wider text-white/40 uppercase sm:text-[9px]">Access</p>
            </div>
            <div className="rounded-xl border border-[#2490ed]/20 bg-[#2490ed]/[0.07] px-2.5 py-2.5 text-center shadow-lg backdrop-blur-md sm:px-3 sm:py-3">
              <p className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[#7ec5ff] sm:text-base">
                <BookOpen className="h-3.5 w-3.5" />
                CEC
              </p>
              <p className="text-[8px] tracking-wider text-white/45 uppercase sm:text-[9px]">Tracked</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0f18]/90 px-2.5 py-2.5 text-center shadow-lg backdrop-blur-md sm:px-3 sm:py-3">
              <p className="text-xs font-bold text-white/90 sm:text-sm">NRPG</p>
              <p className="text-[8px] tracking-wider text-white/40 uppercase sm:text-[9px]">Pathways</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: Award, label: 'IICRC CEC–aligned', color: '#2490ed' },
    { icon: Shield, label: 'Secure & verifiable credentials', color: '#27ae60' },
    { icon: Sparkles, label: 'Built for working techs', color: '#ed9d24' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="mt-12 flex flex-col gap-6 border-t border-white/[0.06] pt-10 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {items.map((item) => (
          <motion.div key={item.label} variants={fadeIn} className="flex items-center gap-2">
            <item.icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
            <span className="text-xs text-white/50">{item.label}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] tracking-[0.12em] text-white/30 uppercase">Aligned with</span>
        {['IICRC', 'NRPG'].map((abbr) => (
        <span
            key={abbr}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-white/45"
          >
            {abbr}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main hero
// ---------------------------------------------------------------------------

interface AnimatedHeroProps {
  benefits: string[];
}

export function AnimatedHero({ benefits }: AnimatedHeroProps) {
  const topBenefits = benefits.slice(0, 4);

  return (
    <section className="relative z-10 overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:gap-12 xl:gap-16">
        <motion.div
            className="min-w-0"
            initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
            <motion.div variants={fadeInUp} transition={{ duration: 0.55, ease: smoothEase }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2490ed]/25 bg-[#2490ed]/10 px-3 py-1 text-xs font-medium text-[#7ec5ff]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2490ed] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2490ed]" />
                </span>
                IICRC continuing education online
              </span>
            </motion.div>

          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.6, ease: smoothEase }}
              className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]"
            >
              Learn like the pros.{' '}
              <span className="bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa] bg-clip-text text-transparent">
                On your schedule.
              </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="mt-5 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg"
          >
              Self-paced IICRC CEC training for restoration and commercial cleaning professionals —
              the same clarity you expect from global learning platforms, tuned for Australian
              technicians and NRPG pathways.
          </motion.p>

            <div className="mt-8 space-y-4">
              <CatalogSearchCue />
          <motion.div
            variants={fadeInUp}
                transition={{ duration: 0.55, ease: smoothEase }}
                className="flex flex-wrap gap-3"
          >
            <Link
              href="/courses"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#ed9d24] px-7 py-3.5 text-sm font-semibold text-[#1a1205] shadow-[0_12px_32px_-12px_rgba(237,157,36,0.55)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_16px_40px_-12px_rgba(237,157,36,0.65)]"
            >
                  Explore courses
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pathways"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white/85 backdrop-blur-sm transition-all duration-200 hover:border-white/25 hover:bg-white/[0.07]"
                >
                  View learning pathways
            </Link>
          </motion.div>
            </div>

          <motion.ul
            variants={staggerContainer}
              initial="hidden"
            animate="visible"
              className="mt-10 grid gap-3 sm:grid-cols-2"
          >
              {topBenefits.map((benefit, i) => (
              <motion.li
                key={benefit}
                variants={fadeInUp}
                  transition={{ duration: 0.45, ease: smoothEase, delay: 0.15 + i * 0.05 }}
                  className="flex items-start gap-2.5 text-sm text-white/50"
              >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/90" />
                  <span>{benefit}</span>
              </motion.li>
            ))}
          </motion.ul>

            <TrustStrip />
          </motion.div>

          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: smoothEase, delay: 0.1 }}
          >
            <HeroLearningPreview />
        </motion.div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Animated Stats Section
// ---------------------------------------------------------------------------

interface Stat {
  value: string;
  label: string;
}

interface AnimatedStatsProps {
  stats: Stat[];
}

export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="relative border-t border-white/[0.06] py-14 md:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(36,144,237,0.12), transparent 60%)',
        }}
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="mb-10 text-center sm:mb-12 sm:text-left">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
            At a glance
          </p>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
            Numbers that matter to busy professionals
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/45 sm:mx-0">
            The same clarity you expect from leading course platforms — tuned for IICRC pathways
            and Australian crews.
          </p>
        </div>
        <motion.div
          className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: smoothEase, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-4 py-7 text-center shadow-[0_16px_48px_-28px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2490ed]/30 hover:shadow-[0_20px_56px_-24px_rgba(36,144,237,0.25)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(36,144,237,0.12),transparent_65%)] opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="relative text-2xl font-bold tabular-nums text-[#2490ed] sm:text-3xl">
                {stat.value}
              </p>
              <p className="relative mt-1.5 text-[10px] font-medium tracking-wider text-white/40 uppercase">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Animated Course Card Wrapper
// ---------------------------------------------------------------------------

interface AnimatedCardProps {
  children: ReactNode;
  index: number;
}

export function AnimatedCard({ children, index }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: smoothEase, delay: index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Animated Section Header
// ---------------------------------------------------------------------------

interface AnimatedSectionProps {
  label: string;
  title: string;
  children: ReactNode;
  rightContent?: ReactNode;
  /** Extra classes on the outer `<section>` (e.g. alternate background). */
  className?: string;
  /** Smaller header for the credentials block — keeps focus on the preview. */
  minimalHeader?: boolean;
}

export function AnimatedSection({
  label,
  title,
  children,
  rightContent,
  className = '',
  minimalHeader = false,
}: AnimatedSectionProps) {
  return (
    <section className={`relative border-t border-white/[0.06] py-16 md:py-20 ${className}`}>
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <motion.div
          className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.5, ease: smoothEase }}
        >
          <div className="min-w-0">
            {minimalHeader ? (
              <>
                <p className="mb-1 text-xs font-medium tracking-wide text-white/35 uppercase">
                  {label}
                </p>
                <h2 className="text-2xl font-bold text-white/90">{title}</h2>
              </>
            ) : (
              <>
                <p className="mb-3 inline-flex items-center rounded-full border border-[#2490ed]/30 bg-[#2490ed]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#7ec5ff] uppercase">
              {label}
            </p>
                <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-balance text-white md:text-3xl lg:text-[2.15rem] lg:leading-tight">
              {title}
            </h2>
                <div
                  className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa]"
                  aria-hidden
                />
              </>
            )}
          </div>
          {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
        </motion.div>
        {children}
      </div>
    </section>
  );
}
