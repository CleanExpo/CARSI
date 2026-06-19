'use client';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Search,
} from 'lucide-react';
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

interface AnimatedHeroProps {
  benefits: string[];
}

function LearningPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-[#eef7ff] via-white to-[#fff7e8] p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#146fc2] uppercase">
              Learning workspace
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              Psychrometry and drying science
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            In progress
          </span>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(36,144,237,0.42),transparent_58%)]" />
          <div className="absolute inset-x-4 top-4 flex gap-1">
            {[52, 38, 66, 30, 72].map((w) => (
              <span key={w} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full rounded-full bg-[#6ebcff]" style={{ width: `${w}%` }} />
              </span>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
              transition={reduceMotion ? undefined : { duration: 3, repeat: Infinity }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#146fc2] shadow-lg"
            >
              <BookOpen className="h-7 w-7" aria-hidden />
            </motion.div>
          </div>
          <div className="absolute right-4 bottom-4 left-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-[#ed9d24]"
                initial={{ width: reduceMotion ? '62%' : '0%' }}
                animate={{ width: '62%' }}
                transition={{ duration: reduceMotion ? 0 : 0.9, ease: smoothEase }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/70">
              <span>12 min watched</span>
              <span>62%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['24/7', 'Access'],
            ['CEC', 'Tracked'],
            ['100%', 'Online'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="font-semibold text-slate-950">{value}</p>
              <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnimatedHero({ benefits }: AnimatedHeroProps) {
  const topBenefits = benefits.slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-[#f6f8fb] py-12 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_20%_0%,rgba(36,144,237,0.16),transparent_62%)]" />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,520px)] lg:gap-14">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p
              variants={fadeInUp}
              className="inline-flex items-center gap-2 rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-xs font-semibold text-[#146fc2] shadow-sm"
            >
              <Award className="h-3.5 w-3.5" aria-hidden />
              IICRC CEC accredited online courses
            </motion.p>

            <motion.h1
              variants={fadeInUp}
              className="mt-6 max-w-3xl text-4xl leading-tight font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
            >
              CARSI restoration training that fits around the workday.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg"
            >
              Browse beginner, intermediate, and advanced restoration and commercial cleaning
              courses for people starting out, updating their knowledge, or maintaining IICRC
              Continuing Education Credits.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#9a4a00] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#7a3500] focus-visible:ring-2 focus-visible:ring-[#ed9d24]/50 focus-visible:outline-none"
              >
                Browse courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2490ed] hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
              >
                Find my pathway
              </Link>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="mt-6 flex max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-sm"
            >
              <Search className="h-5 w-5 shrink-0 text-[#146fc2]" aria-hidden />
              <span className="text-sm">
                Search by discipline, CEC hours, level, or course outcome.
              </span>
            </motion.div>

            <motion.ul variants={staggerContainer} className="mt-8 grid gap-3 sm:grid-cols-2">
              {topBenefits.map((benefit) => (
                <motion.li key={benefit} variants={fadeInUp} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: smoothEase }}
            className="hidden lg:block"
          >
            <LearningPreview />
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

export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="border-y border-slate-200 bg-white py-10">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-[#f8fbff] px-4 py-5 text-center">
              <p className="text-2xl font-bold text-[#146fc2] tabular-nums sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">{stat.label}</p>
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
    <section className={`relative border-t border-slate-200 bg-[#f6f8fb] py-14 md:py-20 ${className}`}>
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
              {label}
            </p>
            {minimalHeader ? (
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
            ) : (
              <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
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
