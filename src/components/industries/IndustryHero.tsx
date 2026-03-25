import type React from 'react';
import { LucideIcon } from 'lucide-react';
import { DisciplinePill } from './DisciplinePill';
import { GlassStatCard } from './GlassStatCard';

interface Discipline {
  code: string;
  label: string;
  color: string;
}

interface Stat {
  value: string;
  label: string;
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
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
      <div className="max-w-2xl">
        {/* Industry pill */}
        <div
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1"
          style={{ color: accentColor, background: `${accentColor}15`, '--tw-ring-color': `${accentColor}30` } as React.CSSProperties}
        >
          <Icon className="h-3.5 w-3.5" />
          {industryName}
        </div>

        <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl">
          {headline}
          <br />
          <span style={{ color: accentColor }}>{headlineAccent}</span>
        </h1>

        <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* Discipline pills */}
        <div className="mb-10 flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <DisciplinePill key={d.code} code={d.code} label={d.label} color={d.color} />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <GlassStatCard key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
    </section>
  );
}
