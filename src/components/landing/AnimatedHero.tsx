'use client';

import { HeroTrainingInfographic } from '@/components/landing/HeroTrainingInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BadgeCheck, Check, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

const easeOut = [0.16, 1, 0.3, 1] as const;
const springSoft = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.8 };

const trustItems = [
  'Free courses to start',
  'IICRC CECs on eligible courses',
  'Certificates anyone can verify',
];

function HeroWord({
  children,
  delay,
  reduceMotion,
  className = '',
}: {
  children: ReactNode;
  delay: number;
  reduceMotion: boolean | null;
  className?: string;
}) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: '0.45em', filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </motion.span>
  );
}

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
  const contentDrift = useTransform(scrollYProgress, [0, 0.5], reduceMotion ? [0, 0] : [0, -36]);
  const contentFade = useTransform(
    scrollYProgress,
    [0, 0.45],
    reduceMotion ? [1, 1] : [1, 0.35],
  );

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#fafbfc]"
      aria-label="CARSI homepage hero"
    >
      {/* Layered light atmosphere: tinted plane, drifting aurora, halo rings, beam, grid, grain */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e9f3fc_26%,#d9e9f9_62%,#cde2f7_100%)]" />

        {/* Aurora fields with slow ambient drift */}
        <motion.div
          className="absolute top-[-14%] left-1/2 h-[52rem] w-[84rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.42),transparent_72%)] blur-[70px]"
          animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
          transition={
            reduceMotion ? undefined : { duration: 16, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        <motion.div
          className="absolute top-[2%] left-[-16%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.34),transparent_70%)] blur-[80px]"
          animate={reduceMotion ? undefined : { y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={
            reduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        <motion.div
          className="absolute top-[16%] right-[-14%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(124,110,245,0.26),transparent_70%)] blur-[80px]"
          animate={reduceMotion ? undefined : { y: [0, -26, 0], scale: [1, 1.05, 1] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }
          }
        />
        <div className="absolute bottom-[-16%] left-1/2 h-[34rem] w-[68rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.30),transparent_70%)] blur-[90px]" />

        {/* Concentric halo rings */}
        <div className="absolute top-[30%] left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#146fc2]/[0.14]" />
        <div className="absolute top-[30%] left-1/2 h-[64rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#146fc2]/[0.09]" />
        <div className="absolute top-[30%] left-1/2 h-[82rem] w-[82rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#146fc2]/[0.05]" />

        {/* Luminous horizon beam behind the panorama */}
        <div className="absolute top-[62%] right-0 left-0">
          <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-[#2490ed]/70 to-transparent" />
          <div className="mx-auto -mt-3 h-7 max-w-3xl bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.32),transparent_70%)] blur-md" />
        </div>

        {/* Dotted grid, masked to the headline area */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_28%,black,transparent)] opacity-[0.4]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        </div>

        {/* Fine film grain for a physical, printed feel */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Soft edge vignette keeps focus centred */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_110%_at_50%_38%,transparent_72%,rgba(255,255,255,0.3)_100%)]" />
      </div>

      <div
        className={`relative flex min-h-[min(92vh,980px)] flex-col items-center justify-center py-24 sm:py-28 ${PUBLIC_SHELL_INNER_CLASS}`}
      >
        <motion.div
          className="mx-auto flex max-w-4xl flex-col items-center text-center"
          style={{ y: contentDrift, opacity: contentFade }}
        >
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

          <h1 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(2.5rem,6.8vw,5.1rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-950">
            <span className="block">
              <HeroWord delay={0.1} reduceMotion={reduceMotion}>
                Become
              </HeroWord>{' '}
              <HeroWord delay={0.18} reduceMotion={reduceMotion}>
                the
              </HeroWord>{' '}
              <HeroWord delay={0.26} reduceMotion={reduceMotion}>
                technician
              </HeroWord>
            </span>
            <span className="mt-[0.06em] block">
              <HeroWord delay={0.38} reduceMotion={reduceMotion}>
                every
              </HeroWord>{' '}
              <HeroWord delay={0.46} reduceMotion={reduceMotion}>
                job
              </HeroWord>{' '}
              <HeroWord delay={0.54} reduceMotion={reduceMotion}>
                site
              </HeroWord>{' '}
              <HeroWord
                delay={0.62}
                reduceMotion={reduceMotion}
                className="relative bg-gradient-to-r from-[#0f5fa8] via-[#2490ed] to-[#38a2f8] bg-clip-text text-transparent"
              >
                trusts.
                <motion.svg
                  viewBox="0 0 160 16"
                  className="absolute -bottom-[0.14em] left-0 h-[0.18em] w-[88%]"
                  fill="none"
                  aria-hidden
                >
                  <motion.path
                    d="M6 11 C 45 3, 105 3, 154 9"
                    stroke="#2490ed"
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0.9 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.7, ease: easeOut, delay: 1.0 }}
                  />
                </motion.svg>
              </HeroWord>
            </span>
          </h1>

          <motion.p
            className="mt-7 max-w-2xl text-[16px] leading-relaxed text-slate-500 sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.66 }}
          >
            <span className="font-medium text-slate-700">
              CARSI trains Australia&apos;s cleaning and restoration professionals online.
            </span>{' '}
            Study around the roster, earn IICRC CECs on eligible courses, and hold credentials
            any client, employer, or insurer can verify in seconds.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.74 }}
          >
            <Link
              href="/courses"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(20,111,194,0.75),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:bg-[#0f5fa8] hover:shadow-[0_22px_50px_-18px_rgba(20,111,194,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none motion-safe:hover:-translate-y-0.5"
            >
              Start learning free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-semibold text-slate-700 backdrop-blur-sm transition hover:border-[#2490ed]/50 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none motion-safe:hover:-translate-y-0.5"
            >
              View pricing
            </Link>
          </motion.div>

          <motion.p
            className="mt-4 text-xs text-slate-400"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            Free courses included. No card needed to start.
          </motion.p>

          <motion.ul
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-slate-500"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#146fc2]" aria-hidden />
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>

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
            className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.24),transparent_65%)] blur-3xl"
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
                transition={{ duration: 1.6, ease: easeOut, delay: 1.25 }}
              />
            ) : null}
          </motion.div>

          {/* Floating proof: verified certificate */}
          <motion.div
            className="absolute -top-10 -right-4 z-30 hidden w-60 lg:block xl:-right-14"
            initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 6 }}
            animate={{ opacity: 1, y: 0, rotate: 3 }}
            transition={{ ...springSoft, delay: 1.4 }}
          >
            <motion.div
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_28px_60px_-26px_rgba(15,23,42,0.35)] backdrop-blur-sm"
              animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2.2 }
              }
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                    Certificate verified
                  </p>
                  <p className="text-[12px] font-semibold text-slate-900">
                    Water Restoration Practitioner
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f6f9fc] px-2.5 py-1.5">
                <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                  ID CRD-2481
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Valid</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating proof: CEC hours toast */}
          <motion.div
            className="absolute -bottom-6 -left-4 z-30 hidden lg:block xl:-left-14"
            initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: -5 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ ...springSoft, delay: 1.6 }}
          >
            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 py-3 pr-5 pl-3.5 shadow-[0_28px_60px_-26px_rgba(15,23,42,0.35)] backdrop-blur-sm"
              animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2.6 }
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef5fb] text-[#146fc2]">
                <GraduationCap className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-slate-900 tabular-nums">
                  +2.0 CEC hours added
                </p>
                <p className="text-[10px] text-slate-400">Logged to your record automatically</p>
              </div>
            </motion.div>
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
    <section
      className={`relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24 ${className}`}
    >
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
