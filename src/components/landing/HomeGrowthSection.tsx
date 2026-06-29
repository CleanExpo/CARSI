'use client';

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

const STAT_PRESENTATION: Record<
  string,
  { icon: LucideIcon; detail: string; badge: string; accent: string; glow: string }
> = {
  'Online Access': {
    icon: Clock,
    detail: 'Study around the roster',
    badge: 'Always on',
    accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
    glow: 'from-[#2490ed]/12 to-transparent dark:from-[#2490ed]/20',
  },
  'Industries Served': {
    icon: Building2,
    detail: 'Sector-specific pathways',
    badge: 'Multi-sector',
    accent: 'text-emerald-600 dark:text-emerald-400',
    glow: 'from-emerald-500/12 to-transparent dark:from-emerald-500/18',
  },
  Courses: {
    icon: BookOpen,
    detail: 'Published in the catalogue',
    badge: 'Catalogue',
    accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
    glow: 'from-[#2490ed]/10 to-transparent dark:from-[#2490ed]/16',
  },
  'IICRC Disciplines': {
    icon: Award,
    detail: 'CEC-aligned course tracks',
    badge: 'IICRC CEC',
    accent: 'text-[#9a4a00] dark:text-[#f2b14f]',
    glow: 'from-[#ed9d24]/14 to-transparent dark:from-[#ed9d24]/20',
  },
};

function getStatPresentation(label: string) {
  return (
    STAT_PRESENTATION[label] ?? {
      icon: Award,
      detail: 'CARSI platform',
      badge: 'CARSI',
      accent: 'text-[#146fc2] dark:text-[#8fd0ff]',
      glow: 'from-[#2490ed]/10 to-transparent',
    }
  );
}

/**
 * Homepage section 2 — proof strip + growth pathways with infographic.
 * Merges the former stats bar and pathways spotlight for a tighter narrative.
 */
export function HomeGrowthSection({ stats }: HomeGrowthSectionProps) {
  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      {/* Stats strip */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[#f6f8fb] dark:border-white/10 dark:bg-[#050505]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(36,144,237,0.1),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(36,144,237,0.14),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden
        />

        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-8 md:py-10`}>
          <p className="mb-5 text-center text-[11px] font-semibold tracking-[0.2em] text-slate-600 uppercase dark:text-white/55">
            Platform at a glance
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => {
              const meta = getStatPresentation(stat.label);
              const Icon = meta.icon;

              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.28)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#2490ed]/25 hover:shadow-[0_22px_48px_-28px_rgba(36,144,237,0.22)] sm:p-5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_44px_-32px_rgba(0,0,0,0.55)] dark:hover:border-[#2490ed]/30"
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-80',
                      meta.glow
                    )}
                    aria-hidden
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06]',
                        meta.accent
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-slate-600 uppercase dark:border-white/10 dark:bg-white/[0.06] dark:text-white/50">
                      {meta.badge}
                    </span>
                  </div>

                  <p className="relative mt-4 text-3xl font-bold tracking-tight text-slate-950 tabular-nums sm:text-[2rem] dark:text-white">
                    {stat.value}
                  </p>
                  <p className="relative mt-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase dark:text-white/55">
                    {stat.label}
                  </p>
                  <p className="relative mt-1 text-[11px] leading-snug text-slate-600 dark:text-white/55">
                    {meta.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Growth pathways */}
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-14 md:py-16`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
          <GrowthPathInfographic className="order-2 lg:order-1" />

          <div className="order-1 lg:order-2">
            <p
              id="home-growth-heading"
              className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]"
            >
              Beyond the catalogue
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white">
              Learn online. Scale in person.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
              Start with self-paced IICRC courses, then join CARSI × CCW Business Growth Days or the
              CCW workshop when you are ready to grow on site.
            </p>

            <ul className="mt-8 space-y-3">
              {homePathwayItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-start gap-4 rounded-xl border border-slate-200/80 bg-[#f8fbff]/80 px-4 py-4 transition hover:border-[#2490ed]/35 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#2490ed]/40 dark:hover:bg-white/[0.06]`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.04]`}
                      >
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
                        className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-[#146fc2] dark:text-white/55 dark:group-hover:text-[#8fd0ff]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href={ccwWorkshopHref}
              className="group mt-4 flex items-center justify-between gap-4 rounded-xl border border-dashed border-slate-300/80 px-4 py-3.5 transition hover:border-[#2490ed]/40 hover:bg-[#f8fbff] dark:border-white/15 dark:hover:border-[#2490ed]/35 dark:hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-3">
                <Award className="h-4 w-4 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                <span className="text-sm font-medium text-slate-800 dark:text-white/85">
                  2-Day Carpet Cleaning Workshop (CCW)
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#146fc2] dark:text-[#8fd0ff]">
                View workshop
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
