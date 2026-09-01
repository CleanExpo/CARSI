import type { CSSProperties } from 'react';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { LANDING_EYEBROW_CLASS, LANDING_LEAD_CLASS } from '@/components/landing/public-shell-width';
import { accentTextVars } from './accentContrast';
import { DisciplinePill } from './DisciplinePill';
import { GlassStatCard } from './GlassStatCard';

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
  accentColor,
  headline,
  headlineAccent,
  description,
  disciplines,
  stats,
}: IndustryHeroProps) {
  const accent = accentTextVars(accentColor, 'large');
  const accentBadge = accentTextVars(accentColor, 'normal');
  return (
    <section className="pb-12 sm:pb-16">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 shadow-[0_32px_90px_-52px_rgba(15,23,42,0.38)]"
        style={{ '--industry-accent': accentColor } as CSSProperties}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,color-mix(in_srgb,var(--industry-accent)_15%,transparent),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,251,255,0.9))]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-0 right-0 h-full w-[46%] [background-image:radial-gradient(rgba(15,23,42,0.18)_1px,transparent_1px)] [mask-image:linear-gradient(to_left,black,transparent)] [background-size:18px_18px] opacity-30"
          aria-hidden
        />

        <div className="relative grid gap-10 px-6 py-8 sm:px-9 sm:py-11 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:gap-14 lg:px-14 lg:py-14">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 ${LANDING_EYEBROW_CLASS} text-[color:var(--carsi-badge-l)]`}
              style={
                {
                  background: `${accentColor}10`,
                  borderColor: `${accentColor}30`,
                  '--carsi-badge-l': accentBadge.light,
                } as CSSProperties
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {industryName}
            </div>

            <h1 className="mt-7 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.55rem,6vw,5.8rem)] leading-[0.96] font-medium tracking-[-0.045em] text-balance text-slate-950">
              {headline} <br aria-hidden />
              <span
                className="text-[color:var(--carsi-accent-l)]"
                style={{ '--carsi-accent-l': accent.light } as CSSProperties}
              >
                {headlineAccent}
              </span>
            </h1>

            <p className={`mt-6 max-w-2xl ${LANDING_LEAD_CLASS}`}>{description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#industry-courses"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
              >
                View recommended courses <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300/90 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
              >
                Ask about team training
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {disciplines.map((d) => (
                <DisciplinePill key={d.label} code={d.code} label={d.label} color={d.color} />
              ))}
            </div>
          </div>

          <div className="relative self-end">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              Sector briefing
            </div>
            <div className="grid gap-3">
              {stats.map((stat) => (
                <GlassStatCard
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  accentColor={accentColor}
                  sourceHref={stat.sourceHref}
                  sourceLabel={stat.sourceLabel}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
