import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

interface Discipline {
  code?: string;
  label: string;
  color: string;
}

interface Stat {
  value: string;
  label: string;
  sourceHref?: string;
  sourceLabel?: string;
}

interface IndustryHeroProps {
  icon: LucideIcon;
  industryName: string;
  accentColor: string;
  headline: string;
  headlineAccent: string;
  description: string;
  disciplines: Discipline[];
  stats: Stat[];
}

export function IndustryHero({
  icon: Icon,
  industryName,
  headline,
  headlineAccent,
  description,
  disciplines,
  stats,
}: IndustryHeroProps) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={`${LANDING_EYEBROW_CLASS} inline-flex items-center gap-2`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {industryName}
          </p>
          <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            {headline} {headlineAccent}
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>{description}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="#industry-courses"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
            >
              View recommended courses
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200/90 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              Ask about team training
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {disciplines.map((d) => (
              <span
                key={d.label}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600"
              >
                {d.code ? `${d.code} · ${d.label}` : d.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={stats.slice(0, 4).map((stat) => ({
          value: stat.value,
          label: stat.label,
        }))}
      />
    </>
  );
}
