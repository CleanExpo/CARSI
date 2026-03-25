import type React from 'react';
import { LucideIcon } from 'lucide-react';

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
  cards: WhyCard[];
}

export function IndustryWhySection({
  industryName,
  headline,
  headlineAccent,
  cards,
}: IndustryWhySectionProps) {
  return (
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground/60">
            Why {industryName} Choose CARSI
          </p>
          <h2 className="text-2xl font-bold text-foreground">
            {headline} <span className="text-primary">{headlineAccent}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-sm border border-border bg-secondary p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm ring-1"
                style={{ background: `${card.color}15`, '--tw-ring-color': `${card.color}30` } as React.CSSProperties}
              >
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <h3 className="mb-2 text-sm font-bold text-foreground">
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground/60">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
