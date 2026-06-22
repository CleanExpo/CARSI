'use client';

import { ArrowRight, Award } from 'lucide-react';
import Link from 'next/link';

import { GrowthPathInfographic } from '@/components/landing/GrowthPathInfographic';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { ccwWorkshopHref, homePathwayItems } from '@/lib/marketing/home-pathways';

interface Stat {
  value: string;
  label: string;
}

interface HomeGrowthSectionProps {
  stats: Stat[];
}

/**
 * Homepage section 2 — proof strip + growth pathways with infographic.
 * Merges the former stats bar and pathways spotlight for a tighter narrative.
 */
export function HomeGrowthSection({ stats }: HomeGrowthSectionProps) {
  return (
    <section
      aria-labelledby="home-growth-heading"
      className="relative border-b border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      {/* Stats strip */}
      <div className="border-b border-slate-200/80 bg-[#f6f8fb]/80 dark:border-white/10 dark:bg-[#050505]/80">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="grid grid-cols-2 divide-slate-200/80 sm:grid-cols-4 sm:divide-x dark:divide-white/10">
            {stats.map((stat) => (
              <div key={stat.label} className="px-4 py-8 text-center sm:py-9">
                <p className="text-3xl font-bold tracking-tight text-[#146fc2] tabular-nums sm:text-4xl dark:text-[#8fd0ff]">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-white/45">
                  {stat.label}
                </p>
              </div>
            ))}
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
