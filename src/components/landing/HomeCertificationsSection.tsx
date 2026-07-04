'use client';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { IICRCDisciplineMap } from '@/components/lms/diagrams/IICRCDisciplineMap';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { ArrowRight, Compass, Map } from 'lucide-react';
import Link from 'next/link';

interface HomeCertificationsSectionProps {
  disciplineCountLabel: number;
}

const highlights = [
  {
    icon: Map,
    title: 'Interactive hub',
    detail: 'Explore disciplines visually, then open matching courses in one click.',
  },
  {
    icon: Compass,
    title: 'Pathway-aligned',
    detail: 'Each node maps to IICRC CEC tracks in the CARSI catalogue.',
  },
] as const;

export function HomeCertificationsSection({ disciplineCountLabel }: HomeCertificationsSectionProps) {
  return (
    <section
      aria-labelledby="home-certifications-heading"
      className="relative border-t border-slate-200/80 bg-white py-14 md:py-20 dark:border-white/10 dark:bg-[#0a0a0a]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_10%_20%,rgba(36,144,237,0.06),transparent_60%)] dark:bg-[radial-gradient(ellipse_55%_50%_at_10%_20%,rgba(36,144,237,0.1),transparent_60%)]"
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-14">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              IICRC CEC Disciplines
            </p>
            <h2
              id="home-certifications-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
            >
              <AcronymTooltip term="IICRC" /> discipline map
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/65">
              Seven core CEC pathways orbit IICRC standards. Hover or tap any node to see the full
              discipline name and jump straight into filtered CEC courses.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-xs font-semibold text-[#146fc2] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#8fd0ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {disciplineCountLabel} disciplines in catalogue
            </div>

            <ul className="mt-8 space-y-3">
              {highlights.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-4 rounded-xl border border-slate-200/80 bg-[#f8fbff]/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.04]">
                    <item.icon className="h-4 w-4 text-[#146fc2] dark:text-[#8fd0ff]" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-950 dark:text-white">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600 dark:text-white/55">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-[#146fc2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f5fa8]"
              >
                Full course catalogue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed] hover:text-[#146fc2] dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#2490ed]/50 dark:hover:text-[#8fd0ff]"
              >
                View pathways
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.35rem] bg-[radial-gradient(ellipse_at_50%_40%,rgba(36,144,237,0.12),transparent_65%)] blur-xl dark:opacity-80"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-gradient-to-br from-white via-[#f8fbff] to-white p-1 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:from-[#0f172a] dark:via-[#0d1524] dark:to-[#0a101c] dark:shadow-[0_28px_70px_-36px_rgba(0,0,0,0.65)]">
              <div className="rounded-[1.15rem] bg-white/90 p-3 sm:p-4 dark:bg-[#080c14]/90">
                <IICRCDisciplineMap />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
