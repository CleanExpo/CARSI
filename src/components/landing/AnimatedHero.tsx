'use client';

import { HeroTrainingInfographic } from '@/components/landing/HeroTrainingInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
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

const trustPoints = [
  'IICRC CEC Accredited',
  'Beginner to advanced',
  'Learn around the roster',
] as const;

interface AnimatedHeroProps {
  benefits: string[];
}

/**
 * Premium “stage + floating product” hero — atmospheric plane, brand-forward
 * CARSI mark, single CTA group, layered product showcase with parallax.
 */
export function AnimatedHero({ benefits: _benefits }: AnimatedHeroProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 48]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -36]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[min(92vh,920px)] overflow-hidden bg-[#f6f8fb] dark:bg-[#050505]"
    >
      {/* Atmospheric plane */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-15%,rgba(36,144,237,0.22),transparent_58%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_50%_-15%,rgba(36,144,237,0.28),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_88%_18%,rgba(237,157,36,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_55%_45%_at_88%_18%,rgba(237,157,36,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_8%_75%,rgba(184,230,46,0.08),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
          style={{
            backgroundImage: `linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent)',
          }}
        />
        <motion.div
          style={{ y: orbY }}
          className="absolute -top-24 left-[12%] h-64 w-64 rounded-full bg-[#2490ed]/25 blur-[90px] dark:bg-[#2490ed]/30"
        />
        <motion.div
          style={{ y: orbY }}
          className="absolute top-[20%] right-[-5%] h-72 w-72 rounded-full bg-[#ed9d24]/18 blur-[100px]"
        />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f6f8fb] to-transparent dark:from-[#050505]" />
      </div>

      <div
        className={`relative flex min-h-[min(92vh,920px)] flex-col justify-center py-16 sm:py-20 lg:py-24 ${PUBLIC_SHELL_INNER_CLASS}`}
      >
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-10 xl:gap-16">
          {/* Copy column — brand first */}
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative z-10">
            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="font-[family-name:var(--font-display,inherit)] text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.92] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white"
            >
              <span className="bg-gradient-to-br from-slate-950 via-slate-800 to-[#146fc2] bg-clip-text text-transparent dark:from-white dark:via-white dark:to-[#8fd0ff]">
                CARSI
              </span>
            </motion.p>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#146fc2] uppercase dark:text-[#8fd0ff]"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Australia&apos;s restoration training platform
            </motion.p>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="mt-6 max-w-xl text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.12] font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Professional training that fits the workday.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/65"
            >
              Self-paced IICRC CEC courses for technicians starting out, updating skills, or
              maintaining credentials — without travel or downtime.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: smoothEase }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/courses"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#146fc2] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_48px_-16px_rgba(20,111,194,0.65)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0f5fa8] hover:shadow-[0_24px_56px_-14px_rgba(20,111,194,0.7)] focus-visible:ring-2 focus-visible:ring-[#2490ed]/50 focus-visible:outline-none"
              >
                Browse courses
                <ArrowRight
                  className="h-4 w-4 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300/80 bg-white/70 px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#2490ed] hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-[#2490ed]/50 dark:hover:text-[#8fd0ff]"
              >
                Find my pathway
              </Link>
            </motion.div>

            <motion.ul
              variants={staggerContainer}
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-slate-200/80 pt-6 dark:border-white/10"
            >
              {trustPoints.map((point) => (
                <motion.li
                  key={point}
                  variants={fadeInUp}
                  transition={{ duration: 0.45, ease: smoothEase }}
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

          {/* Product stage */}
          <motion.div style={{ y: stageY }} className="relative mx-auto w-full max-w-[620px] lg:max-w-none">
            <div
              className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-[#2490ed]/15 via-transparent to-[#ed9d24]/12 blur-2xl dark:from-[#2490ed]/25 dark:to-[#ed9d24]/15"
              aria-hidden
            />
            <div className="relative">
              <HeroTrainingInfographic />
            </div>
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: smoothEase, delay: index * 0.05 }}
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
      className={`relative border-t border-slate-200/80 bg-[#f6f8fb] py-16 md:py-24 dark:border-white/10 dark:bg-[#050505] ${className}`}
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: smoothEase }}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
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
        </motion.div>
        {children}
      </div>
    </section>
  );
}
