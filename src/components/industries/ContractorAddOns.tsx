import type { CSSProperties } from 'react';

import { CheckCircle2, ArrowRight, Briefcase } from 'lucide-react';
import Link from 'next/link';

import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { accentTextVars, accentPillTextVars } from './accentContrast';
import {
  cleanerUpgrades,
  industryAddonContent,
  type IndustryAddonVariant,
} from '@/lib/marketing/industry-page-data';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingBodySm,
  marketingEyebrowPill,
  marketingIconWrap,
  marketingPanel,
  marketingSection,
  marketingSectionTitle,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

interface ContractorAddOnsProps {
  accentColor?: string;
  variant?: IndustryAddonVariant;
}

export function ContractorAddOns({ accentColor = '#2490ed', variant = 'default' }: ContractorAddOnsProps) {
  const content = industryAddonContent[variant];
  const accent = accentTextVars(accentColor, 'large');
  const accentPill = accentPillTextVars(accentColor);

  return (
    <>
      <section className={marketingSection}>
        <div className="mb-8 max-w-4xl">
          <p className={`mb-3 ${marketingEyebrowPill}`}>{content.eyebrow}</p>
          <h2 className={marketingSectionTitle}>
            {content.title}{' '}
            <span
              className="text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
              style={{ '--carsi-accent-l': accent.light, '--carsi-accent-d': accent.dark } as CSSProperties}
            >
              {content.titleAccent}
            </span>
          </h2>
          <p className={`mt-4 max-w-3xl ${marketingBodySm}`}>{content.body}</p>
          <div
            className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa]"
            aria-hidden
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.panels.map((panel) => (
            <div key={panel.name} className={`p-5 ${marketingPanel}`}>
              <div className={`mb-3 ${marketingIconWrap}`} style={{ color: accentColor }}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </div>
              <p className={`text-sm font-semibold ${marketingTextStrong}`}>{panel.name}</p>
              <p className={`mt-2 text-xs leading-relaxed ${marketingTextMuted}`}>{panel.requirement}</p>
            </div>
          ))}
        </div>
      </section>

      {content.showUpgrades ? (
        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="For cleaning contractors"
            title="Upgrade your service offering"
            body="ISSA-aligned cleaning businesses can add IICRC certifications to differentiate from competitors, qualify for insurance work, and charge higher rates for restoration services."
          />

          <div className="space-y-3">
            {cleanerUpgrades.map((upgrade) => (
              <div
                key={upgrade.base}
                className={`flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center ${marketingPanel}`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 shrink-0 text-slate-400 dark:text-white/45" aria-hidden />
                  <span className={`text-sm font-medium ${marketingTextStrong}`}>{upgrade.base}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-white/35">+</span>
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
                    style={{
                      background: `${accentColor}20`,
                      borderColor: `${accentColor}40`,
                      '--carsi-accent-l': accentPill.light,
                      '--carsi-accent-d': accentPill.dark,
                    } as CSSProperties}
                  >
                    {upgrade.addon}
                  </span>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-slate-300 dark:text-white/25 sm:block" aria-hidden />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-[#34d399]" aria-hidden />
                  <span className={`text-sm ${marketingTextMuted}`}>{upgrade.benefit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className={marketingBtnPrimary}>
              Browse certification courses <ArrowRight className="h-4 w-4" aria-hidden />
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
