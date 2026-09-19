import type { LucideIcon } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

interface WhyCard {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

interface IndustryWhySectionProps {
  industryName: string;
  headline: string;
  headlineAccent: string;
  accentColor?: string;
  cards: WhyCard[];
}

export function IndustryWhySection({
  industryName,
  headline,
  headlineAccent,
  cards,
}: IndustryWhySectionProps) {
  return (
    <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Why {industryName} choose CARSI</p>
        <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
          {headline} {headlineAccent}
        </h2>
        <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
          Training organised around the constraints technicians meet on site, with a clear path from
          task to course.
        </p>
        <div className="mt-12 grid gap-10 border-t border-slate-200/70 pt-10 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <article
              key={card.title}
              className="md:border-l md:border-slate-200/70 md:pl-8 md:first:border-l-0 md:first:pl-0"
            >
              <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-slate-300 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </p>
              <card.icon className="mt-5 h-5 w-5 text-[#146fc2]" aria-hidden />
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
