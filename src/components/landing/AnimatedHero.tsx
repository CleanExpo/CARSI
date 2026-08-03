'use client';

import { HeroTrainingInfographic } from '@/components/landing/HeroTrainingInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRef, type MouseEvent, type ReactNode } from 'react';

const springSoft = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.8 };
const springSnappy = { type: 'spring' as const, stiffness: 280, damping: 24 };

interface AnimatedHeroProps {
  benefits: string[];
}

/**
 * Light-first editorial hero — oversized brand, calm plane, mouse-aware product stage.
 * No floating chips, no dark atmosphere, no clutter in the first viewport.
 */
export function AnimatedHero({ benefits: _benefits }: AnimatedHeroProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 140, damping: 22 });
  const sy = useSpring(my, { stiffness: 140, damping: 22 });
  const rotateX = useTransform(sy, [-0.5, 0.5], reduceMotion ? [0, 0] : [6, -6]);
  const rotateY = useTransform(sx, [-0.5, 0.5], reduceMotion ? [0, 0] : [-8, 8]);
  const glareX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(255,255,255,0.55), transparent 55%)`;

  function onStageMove(e: MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onStageLeave() {
    mx.set(0);
    my.set(0);
  }

  const letters = 'CARSI'.split('');

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#fafbfc]"
      aria-label="CARSI homepage hero"
    >
      {/* Soft light plane — calm, not neon */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_48%,#eef5fb_100%)]" />
        <motion.div
          className="absolute -top-32 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-[#2490ed]/[0.09] blur-[100px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.06, 1],
                  opacity: [0.7, 1, 0.7],
                  transition: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
                }
          }
        />
        <div className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>
        {/* Soft horizon line */}
        <div className="absolute right-0 bottom-[18%] left-0 h-px bg-gradient-to-r from-transparent via-[#2490ed]/25 to-transparent" />
      </div>

      <div
        className={`relative grid min-h-[min(94vh,900px)] items-center gap-12 py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-16 lg:py-24 ${PUBLIC_SHELL_INNER_CLASS}`}
      >
        <div className="relative z-10 max-w-xl">
          <motion.p
            className="text-[11px] font-medium tracking-[0.28em] text-[#146fc2] uppercase"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.05 }}
          >
            Australian restoration training
          </motion.p>

          {/* Brand-first letter reveal */}
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.86] font-bold tracking-[-0.055em] text-slate-950">
            <span className="sr-only">CARSI</span>
            <span aria-hidden className="inline-flex">
              {letters.map((letter, i) => (
                <motion.span
                  key={`${letter}-${i}`}
                  className="inline-block"
                  initial={reduceMotion ? false : { opacity: 0, y: 48, rotateX: -40 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ ...springSnappy, delay: reduceMotion ? 0 : 0.08 + i * 0.06 }}
                  style={{ transformOrigin: '50% 100%', perspective: 600 }}
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.div
            className="mt-6 h-px w-full origin-left bg-gradient-to-r from-[#146fc2] via-[#2490ed]/50 to-transparent"
            initial={reduceMotion ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
            aria-hidden
          />

          <motion.p
            className="mt-7 font-[family-name:var(--font-display)] text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.25] font-semibold tracking-tight text-slate-800"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.35 }}
          >
            Professional training that fits the workday.
          </motion.p>

          <motion.p
            className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.45 }}
          >
            Self-paced IICRC CEC Accredited courses — learn around the roster, track CECs, earn
            verifiable credentials.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.55 }}
          >
            <Link
              href="/courses"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.7)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              Browse courses
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-semibold text-slate-700 backdrop-blur-sm transition hover:border-[#2490ed]/50 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              Find my pathway
            </Link>
          </motion.div>
        </div>

        {/* Mouse-aware product stage */}
        <div
          ref={stageRef}
          onMouseMove={onStageMove}
          onMouseLeave={onStageLeave}
          className="relative z-10 mx-auto w-full max-w-[560px] [perspective:1200px] lg:max-w-none"
        >
          <motion.div
            style={{
              rotateX: reduceMotion ? 0 : rotateX,
              rotateY: reduceMotion ? 0 : rotateY,
              transformStyle: 'preserve-3d',
            }}
            initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...springSoft, delay: 0.25 }}
            className="relative"
          >
            <div
              className="pointer-events-none absolute -inset-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(36,144,237,0.14),transparent_65%)] blur-2xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-[0_40px_80px_-40px_rgba(15,23,42,0.28)]">
              <motion.div
                className="pointer-events-none absolute inset-0 z-10 mix-blend-soft-light"
                style={{ background: glare }}
                aria-hidden
              />
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
                  ? 'font-[family-name:var(--font-display)] text-2xl font-bold text-slate-950'
                  : 'max-w-3xl font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-950 md:text-3xl'
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
