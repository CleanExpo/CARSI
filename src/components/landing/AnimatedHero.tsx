'use client';

import { HeroTrainingInfographic } from '@/components/landing/HeroTrainingInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const trustPoints = [
  'IICRC CEC Accredited',
  'Beginner to advanced',
  'Learn around the roster',
] as const;

interface AnimatedHeroProps {
  benefits: string[];
}

export function AnimatedHero({ benefits: _benefits }: AnimatedHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#f6f8fb] py-14 sm:py-16 lg:py-20 dark:bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_15%_-10%,rgba(36,144,237,0.14),transparent_58%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_15%_-10%,rgba(36,144,237,0.18),transparent_58%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,580px)] lg:gap-16">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p
              variants={fadeInUp}
              className="inline-flex items-center gap-2 rounded-full border border-[#b8dbfb] bg-white/90 px-3 py-1 text-xs font-semibold text-[#146fc2] shadow-sm backdrop-blur-sm dark:border-[#2490ed]/30 dark:bg-white/[0.06] dark:text-[#8fd0ff]"
            >
              <Award className="h-3.5 w-3.5" aria-hidden />
              Australia&apos;s restoration training platform
            </motion.p>

            <motion.h1
              variants={fadeInUp}
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] dark:text-white"
            >
              Professional training that fits the workday.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/65"
            >
              Self-paced IICRC CEC courses for technicians starting out, updating skills, or
              maintaining credentials — without travel or downtime.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#146fc2] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(20,111,194,0.55)] transition hover:-translate-y-0.5 hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/50 focus-visible:outline-none"
              >
                Browse courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300/90 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#2490ed] hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#2490ed]/50 dark:hover:text-[#8fd0ff]"
              >
                Find my pathway
              </Link>
            </motion.div>

            <motion.ul variants={staggerContainer} className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {trustPoints.map((point) => (
                <motion.li
                  key={point}
                  variants={fadeInUp}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/75"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  {point}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.12 }}
            className="mx-auto w-full max-w-[600px] lg:max-w-none"
          >
            <HeroTrainingInfographic />
          </motion.div>
        </div>
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

/** @deprecated Stats moved into {@link HomeGrowthSection}. Kept for import compatibility. */
export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="border-y border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-200 bg-[#f8fbff] px-4 py-5 text-center dark:border-white/10 dark:bg-white/[0.04]"
            >
              <p className="text-2xl font-bold text-[#146fc2] tabular-nums sm:text-3xl dark:text-[#8fd0ff]">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-white/55">
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
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: smoothEase, delay: index * 0.04 }}
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
      className={`relative border-t border-slate-200/80 bg-[#f6f8fb] py-14 md:py-20 dark:border-white/10 dark:bg-[#050505] ${className}`}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase dark:border-[#2490ed]/30 dark:bg-white/[0.06] dark:text-[#8fd0ff]">
              {label}
            </p>
            {minimalHeader ? (
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{title}</h2>
            ) : (
              <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white">
                {title}
              </h2>
            )}
          </div>
          {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
