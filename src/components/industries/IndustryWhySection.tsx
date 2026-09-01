import type { CSSProperties } from 'react';

import type { LucideIcon } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { accentTextVars } from './accentContrast';
import {
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
} from '@/lib/marketing/marketing-ui';

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
  accentColor = '#2490ed',
  cards,
}: IndustryWhySectionProps) {
  const accent = accentTextVars(accentColor, 'large');
  return (
    <section className="py-16 md:py-24">
      <div className="grid items-start gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <p className={LANDING_EYEBROW_CLASS}>Why {industryName} choose CARSI</p>
          <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>
            {headline} <br aria-hidden />
            <span
              className="text-[color:var(--carsi-accent-l)]"
              style={{ '--carsi-accent-l': accent.light } as CSSProperties}
            >
              {headlineAccent}
            </span>
          </h2>
          <p className={`mt-5 max-w-md ${LANDING_LEAD_CLASS}`}>
            Training organised around the actual constraints technicians meet on site, with a clear
            path from task to course.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, index) => (
            <article
              key={card.title}
              className={`p-6 sm:p-7 ${index === 0 ? 'sm:col-span-2' : ''} ${marketingPanel} ${marketingPanelHover}`}
            >
              <div
                className={`mb-4 ${marketingIconWrap}`}
                style={{
                  borderColor: `${card.color}35`,
                  background: `${card.color}12`,
                  color: card.color,
                }}
              >
                <card.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.015em] text-slate-950">
                {card.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
