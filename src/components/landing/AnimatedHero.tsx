'use client';

import { HeroTrainingInfographic } from '@/components/landing/HeroTrainingInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

const easeOut = [0.16, 1, 0.3, 1] as const;
const springSoft = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.8 };

const trustItems = [
  'Free courses to start',
  'IICRC CECs on eligible courses',
  'Certificates anyone can verify',
];

interface AnimatedHeroProps {
  benefits: string[];
}

/**
 * Centered cinematic editorial hero. A full-viewport, single-column
 * composition with a staggered headline reveal and a scroll-linked product
 * panorama. Replaces the old side-by-side hero pattern entirely.
 */
export function AnimatedHero({ benefits: _benefits }: AnimatedHeroProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const panoramaRotate = useTransform(scrollYProgress, [0, 0.6], reduceMotion ? [0, 0] : [8, 0]);
  const panoramaLift = useTransform(scrollYProgress, [0, 0.6], reduceMotion ? [0, 0] : [0, -20]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#fafbfc]"
      aria-label="CARSI homepage hero"
    >
      {/* Calm light atmosphere: gradient plane, soft glow, dotted grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fd_55%,#eef5fb_100%)]" />
        <div className="absolute top-[-12%] left-1/2 h-[42rem] w-[64rem] -translate-x-1/2 rounded-full bg-[#2490ed]/[0.10] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_28%,black,transparent)]">
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

      <div
        className={`relative flex min-h-[min(92vh,980px)] flex-col items-center justify-center py-24 sm:py-28 ${PUBLIC_SHELL_INNER_CLASS}`}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.div
            className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white/80 py-1.5 pr-4 pl-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.05 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef5fb] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#146fc2] uppercase">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#2490ed] opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#146fc2]" />
              </span>
              Accredited
            </span>
            <span className="text-[12px] font-medium text-slate-600">
              IICRC CEC Accredited provider, made in Australia
            </span>
          </motion.div>

          <h1 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(2.7rem,7.5vw,5.6rem)] leading-[1.04] tracking-[-0.035em]">
            <motion.span
              className="block font-medium text-slate-900"
              initial={reduceMotion ? false : { opacity: 0, y: 22, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: easeOut, delay: 0.12 }}
            >
              Learn the craft.
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-[#0f5fa8] via-[#2490ed] to-[#0f5fa8] bg-clip-text font-semibold text-transparent"
              initial={reduceMotion ? false : { opacity: 0, y: 22, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: easeOut, delay: 0.26 }}
            >
              Carry the proof.
            </motion.span>
          </h1>

          <motion.p
            className="mt-7 max-w-2xl text-[16px] leading-relaxed font-normal text-slate-500 sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.42 }}
          >
            CARSI is the online training platform for Australian cleaning and restoration
            professionals. Study around the roster, earn IICRC CECs on eligible courses, and hold
            credentials anyone can verify in seconds.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.52 }}
          >
            <Link
              href="/courses"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(20,111,194,0.75),inset_0_1px_0_rgba(255,255,255,0.18)] transition motion-safe:hover:-translate-y-0.5 hover:bg-[#0f5fa8] hover:shadow-[0_22px_50px_-18px_rgba(20,111,194,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Start learning free
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-semibold text-slate-700 backdrop-blur-sm transition motion-safe:hover:-translate-y-0.5 hover:border-[#2490ed]/50 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              View pricing
            </Link>
          </motion.div>

          <motion.ul
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-slate-500"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.62 }}
          >
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Product panorama: the wow moment */}
        <motion.div
          className="relative mx-auto mt-16 w-full max-w-5xl [perspective:2000px] sm:mt-20"
          initial={reduceMotion ? false : { opacity: 0, y: 60, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springSoft, delay: 0.7 }}
        >
          <div
            className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 rounded-[3rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(36,144,237,0.10),transparent_35%,transparent_65%,rgba(20,111,194,0.10))] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.16),transparent_65%)] blur-3xl"
            aria-hidden
          />

          <motion.div
            style={{
              rotateX: panoramaRotate,
              y: panoramaLift,
              transformStyle: 'preserve-3d',
            }}
            className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_60px_120px_-60px_rgba(15,23,42,0.35)]"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white to-transparent"
              aria-hidden
            />
            <HeroTrainingInfographic />

            {!reduceMotion ? (
              <motion.div
                className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                initial={{ x: '-120%' }}
                animate={{ x: '380%' }}
                transition={{ duration: 1.4, ease: easeOut, delay: 1.15 }}
              />
            ) : null}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

interface Stat {
  value: string;
  label: string;
}

interface AnimatedStatsProps {
  stats: Stat[];
}

/** @deprecated Stats moved into {@link HomeTrustStrip}. Kept for import compatibility. */
export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="border-y border-slate-200/80 bg-white py-10">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#146fc2] tabular-nums sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium tracking-wider text-slate-500 uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface AnimatedCardProps {
  children: ReactNode;
  index: number;
}

export function AnimatedCard({ children, index }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...springSoft, delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedSectionProps {
  label: string;
  title: string;
  children: ReactNode;
  rightContent?: ReactNode;
  className?: string;
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
    <section className={`relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24 ${className}`}>
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={springSoft}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-2 text-[11px] font-medium tracking-[0.2em] text-[#146fc2] uppercase">
              {label}
            </p>
            <h2
              className={
                minimalHeader
                  ? 'font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-slate-950'
                  : 'max-w-3xl font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-slate-950 md:text-3xl'
              }
            >
              {title}
            </h2>
          </div>
          {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
        </motion.div>
        {children}
      </div>
    </section>
  );
}
