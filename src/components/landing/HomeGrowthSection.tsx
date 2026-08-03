'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, Building2, Clock, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { GrowthPathInfographic } from '@/components/landing/GrowthPathInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { ccwWorkshopHref, homePathwayItems } from '@/lib/marketing/home-pathways';
import { cn } from '@/lib/utils';

interface Stat {
  value: string;
  label: string;
}

interface HomeGrowthSectionProps {
  stats: Stat[];
}

const STAT_PRESENTATION: Record<string, { icon: LucideIcon; detail: string; accent: string }> = {
  'Online Access': {
    icon: Clock,
    detail: 'Study around the roster',
    accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
  },
  'Industries Served': {
    icon: Building2,
    detail: 'Sector-specific pathways',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  Courses: {
    icon: BookOpen,
    detail: 'Published in the catalogue',
    accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
  },
  'IICRC Disciplines': {
    icon: Award,
    detail: 'CEC Accredited course tracks',
    accent: 'text-[#9a4a00] dark:text-[#f2b14f]',
  },
};

function getStatPresentation(label: string) {
  return (
    STAT_PRESENTATION[label] ?? {
      icon: Award,
      detail: 'CARSI platform',
      accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
    }
  );
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Homepage growth section — editorial metric ribbon + pathways narrative.
 */
export function HomeGrowthSection({ stats }: HomeGrowthSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      {/* Editorial metric ribbon */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[#0f172a] text-white dark:border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_50%,rgba(36,144,237,0.35),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(237,157,36,0.2),transparent_50%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-10 md:py-12`}>
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#8fd0ff] uppercase">
                Platform at a glance
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-300">
                Live catalogue signals — access, coverage, and CEC disciplines in one ribbon.
              </p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-white/10 md:flex-row md:divide-x md:divide-y-0">
            {stats.map((stat, i) => {
              const meta = getStatPresentation(stat.label);
              const Icon = meta.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, ease, delay: i * 0.06 }}
                  className="group flex flex-1 items-start gap-4 px-0 py-5 md:px-6 md:py-2 first:md:pl-0 last:md:pr-0"
                >
                  <span
                    className={cn(
                      'mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 transition group-hover:border-[#2490ed]/40 group-hover:bg-[#2490ed]/15',
                      meta.accent
                    )}
                  >
                    <Icon className="h-5 w-5 text-[#8fd0ff]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-3xl font-bold tracking-tight text-white tabular-nums sm:text-[2.15rem]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{meta.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Growth pathways — editorial split */}
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-20`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
          <GrowthPathInfographic className="order-2 lg:order-1" />

          <div className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              Beyond the catalogue
            </p>
            <h2
              id="home-growth-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
            >
              Learn online. Scale in person.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
              Start with self-paced IICRC CEC courses, then join CARSI × CCW Business Growth Days or
              the CCW workshop when you are ready to grow on site.
            </p>

            <ul className="mt-8 space-y-3">
              {homePathwayItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-start gap-4 rounded-2xl border border-transparent px-3 py-3.5 transition hover:border-slate-200/80 hover:bg-[#f8fbff] dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.04]">
                        <Icon className={`h-4 w-4 ${item.accentClass}`} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${item.accentClass}`}
                        >
                          {item.label}
                        </span>
                        <span className="mt-1 block font-semibold text-slate-950 dark:text-white">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-600 dark:text-white/55">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight
                        className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#146fc2] dark:text-white/40 dark:group-hover:text-[#8fd0ff]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href={ccwWorkshopHref}
              className="group mt-4 flex items-center justify-between gap-4 border-t border-slate-200/80 px-1 pt-5 transition dark:border-white/10"
            >
              <span className="flex items-center gap-3">
                <Award className="h-4 w-4 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                <span className="text-sm font-medium text-slate-800 dark:text-white/85">
                  2-Day Carpet Cleaning Workshop (CCW)
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#146fc2] dark:text-[#8fd0ff]">
                View workshop
                <ArrowRight
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
