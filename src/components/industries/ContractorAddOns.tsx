import type { CSSProperties } from 'react';

import { ArrowRight, Briefcase, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  cleanerUpgrades,
  industryAddonContent,
  type IndustryAddonVariant,
} from '@/lib/marketing/industry-page-data';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingPanel,
  marketingSection,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';
import { accentPillTextVars, accentTextVars } from './accentContrast';

interface ContractorAddOnsProps {
  accentColor?: string;
  variant?: IndustryAddonVariant;
}

export function ContractorAddOns({
  accentColor = '#2490ed',
  variant = 'default',
}: ContractorAddOnsProps) {
  const content = industryAddonContent[variant];
  const accent = accentTextVars(accentColor, 'large');
  const accentPill = accentPillTextVars(accentColor);

  return (
    <>
      <section className="py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className={LANDING_EYEBROW_CLASS}>{content.eyebrow}</p>
            <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>
              {content.title} <br aria-hidden />
              <span
                className="text-[color:var(--carsi-accent-l)]"
                style={{ '--carsi-accent-l': accent.light } as CSSProperties}
              >
                {content.titleAccent}
              </span>
            </h2>
            <p className={`mt-5 max-w-md ${LANDING_LEAD_CLASS}`}>{content.body}</p>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]">
            {content.panels.map((panel, index) => (
              <div
                key={panel.name}
                className="grid gap-3 border-b border-slate-200/80 px-5 py-5 last:border-b-0 sm:grid-cols-[44px_0.72fr_1.28fr] sm:items-center sm:px-7"
              >
                <span className="font-mono text-xs font-semibold text-slate-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className={`text-sm font-semibold ${marketingTextStrong}`}>{panel.name}</p>
                <p className={`text-sm leading-relaxed ${marketingTextMuted}`}>
                  {panel.requirement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {content.showUpgrades ? (
        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="For cleaning contractors"
            title="Upgrade your service offering"
            body="ISSA-aligned cleaning businesses can add IICRC CEC courses to build restoration skills, differentiate from competitors, and charge higher rates for restoration services. CARSI delivers continuing education credits, not IICRC certification."
          />

          <div className="space-y-3">
            {cleanerUpgrades.map((upgrade) => (
              <div
                key={upgrade.base}
                className={`flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center ${marketingPanel}`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase
                    className="h-4 w-4 shrink-0 text-slate-400 dark:text-white/45"
                    aria-hidden
                  />
                  <span className={`text-sm font-medium ${marketingTextStrong}`}>
                    {upgrade.base}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-white/35">+</span>
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
                    style={
                      {
                        background: `${accentColor}20`,
                        borderColor: `${accentColor}40`,
                        '--carsi-accent-l': accentPill.light,
                        '--carsi-accent-d': accentPill.dark,
                      } as CSSProperties
                    }
                  >
                    {upgrade.addon}
                  </span>
                </div>
                <ArrowRight
                  className="hidden h-4 w-4 text-slate-300 sm:block dark:text-white/25"
                  aria-hidden
                />
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-[#34d399]"
                    aria-hidden
                  />
                  <span className={`text-sm ${marketingTextMuted}`}>{upgrade.benefit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className={marketingBtnPrimary}>
              Browse CEC courses <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/pathways" className={marketingBtnSecondary}>
              View learning pathways
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
