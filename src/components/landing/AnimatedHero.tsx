'use client';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Search,
  Shield,
  Sparkles,
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
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-1/2 left-1/2 h-[120%] w-[140%] -translate-x-1/2"
        style={{
          background: `
            radial-gradient(ellipse 45% 35% at 70% 20%, rgba(36, 144, 237, 0.22), transparent 55%),
            radial-gradient(ellipse 40% 30% at 20% 60%, rgba(0, 212, 170, 0.08), transparent 50%),
            radial-gradient(ellipse 35% 40% at 90% 75%, rgba(237, 157, 36, 0.06), transparent 45%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, black 15%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 65% at 50% 45%, black 15%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
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

function HeroLearningPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,520px)] lg:mr-0 lg:ml-auto">
      <HeroMeshBackdrop />

      {/* Back card — “pathway” */}
      <motion.div
        initial={{ opacity: 0, x: 40, rotate: -6 }}
        animate={{ opacity: 1, x: 0, rotate: -6 }}
        transition={{ duration: 0.7, ease: smoothEase, delay: 0.2 }}
        className="absolute top-8 left-4 z-[1] w-[88%] rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-2xl backdrop-blur-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold tracking-[0.15em] text-white/35 uppercase">
            Your pathway
          </span>
          <span className="rounded-full bg-[#2490ed]/15 px-2 py-0.5 font-mono text-[10px] text-[#7ec5ff]">
            IICRC CEC
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#2490ed] to-[#38a8ff]" />
          </div>
          <p className="text-xs text-white/45">Water damage restoration track</p>
        </div>
      </motion.div>

      {/* Front card — “now playing” */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: smoothEase, delay: 0.35 }}
        className="relative z-[2] mt-24 rounded-2xl border border-white/[0.12] bg-[#060a12]/95 p-1 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.05)_inset] backdrop-blur-xl"
      >
        <div className="overflow-hidden rounded-[14px]">
          <div className="relative aspect-video bg-gradient-to-br from-[#1a2a42] via-[#0d1524] to-[#060a12]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(36,144,237,0.25),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md"
              >
                <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" />
              </motion.div>
            </div>
            <div className="absolute right-3 bottom-3 left-3">
              <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-black/40">
                <motion.div
                  className="h-full rounded-full bg-[#2490ed]"
                  initial={{ width: '0%' }}
                  animate={{ width: '38%' }}
                  transition={{ duration: 1.2, ease: smoothEase, delay: 0.8 }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] tabular-nums text-white/50">
                <span>12:04</span>
                <span>31:20</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] bg-[#070b14]/90 px-4 py-3">
            <p className="text-[10px] font-medium tracking-wider text-[#2490ed]/90 uppercase">
              Now learning
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/90">
              Psychrometry & drying science — module assessment prep
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">
                <Clock className="h-3 w-3" />
                Self-paced
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300/90">
                <Sparkles className="h-3 w-3" />
                CEC eligible
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating stat chips */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: smoothEase, delay: 0.65 }}
        className="absolute -right-2 bottom-16 z-[3] hidden rounded-xl border border-white/10 bg-[#0a0f18]/95 px-3 py-2 shadow-xl backdrop-blur-md sm:block"
      >
        <p className="font-mono text-lg font-bold text-white tabular-nums">24/7</p>
        <p className="text-[9px] tracking-wider text-white/40 uppercase">Access</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: smoothEase, delay: 0.75 }}
        className="absolute -left-1 bottom-28 z-[3] hidden rounded-xl border border-white/10 bg-[#0a0f18]/95 px-3 py-2 shadow-xl backdrop-blur-md sm:block"
      >
        <p className="flex items-center gap-1 font-mono text-sm font-bold text-[#7ec5ff]">
          <BookOpen className="h-3.5 w-3.5" />
          CEC
        </p>
        <p className="text-[9px] tracking-wider text-white/40 uppercase">Tracked</p>
      </motion.div>
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
