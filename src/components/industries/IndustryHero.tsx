import type { LucideIcon } from 'lucide-react';

import { DisciplinePill } from './DisciplinePill';
import { GlassStatCard } from './GlassStatCard';
import { marketingBody, marketingHeading } from '@/lib/marketing/marketing-ui';

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
    <section className="pb-12 pt-2 sm:pb-14">
      <div className="max-w-4xl">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            background: `${accentColor}15`,
            borderColor: `${accentColor}35`,
            color: accentColor,
          }}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {industryName}
        </div>

        <h1 className={`max-w-5xl ${marketingHeading}`}>
          {headline}
          <br />
          <span style={{ color: accentColor }}>{headlineAccent}</span>
        </h1>

        <p className={`mt-5 max-w-3xl ${marketingBody}`}>{description}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <DisciplinePill key={d.code} code={d.code} label={d.label} color={d.color} />
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {stats.map((stat) => (
          <GlassStatCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            accentColor={accentColor}
          />
        ))}
      </div>
    </section>
  );
}
