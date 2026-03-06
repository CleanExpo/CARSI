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
    <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p
            className="mb-2 text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Why {industryName} Choose CARSI
          </p>
          <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {headline} <span style={{ color: '#2490ed' }}>{headlineAccent}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg p-6 transition-transform duration-200 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background: `${card.color}15`,
                  border: `1px solid ${card.color}30`,
                }}
              >
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <h3 className="mb-2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
