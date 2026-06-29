import type { CSSProperties } from 'react';

import type { LucideIcon } from 'lucide-react';

import { accentTextVars } from './accentContrast';
import {
  marketingBodySm,
  marketingEyebrowPill,
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
  marketingSectionTitle,
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
    <section className={marketingSection}>
      <div className="mb-8 max-w-4xl md:mb-10">
        <p className={`mb-3 ${marketingEyebrowPill}`}>Why {industryName} choose CARSI</p>
        <h2 className={marketingSectionTitle}>
          {headline}{' '}
          <span
            className="text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
            style={{ '--carsi-accent-l': accent.light, '--carsi-accent-d': accent.dark } as CSSProperties}
          >
            {headlineAccent}
          </span>
        </h2>
        <div
          className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa]"
          aria-hidden
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className={`p-6 ${marketingPanel} ${marketingPanelHover}`}>
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
            <h3 className="text-base font-semibold text-slate-900 dark:text-white/90">{card.title}</h3>
            <p className={`mt-3 ${marketingBodySm}`}>{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
