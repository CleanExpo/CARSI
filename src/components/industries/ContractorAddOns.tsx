import { CheckCircle2, ArrowRight, Briefcase } from 'lucide-react';
import Link from 'next/link';

import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  cleanerUpgrades,
  industryAddonContent,
  type IndustryAddonVariant,
} from '@/lib/marketing/industry-page-data';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingIconWrap,
  marketingPanel,
  marketingSection,
  marketingSectionTitle,
} from '@/lib/marketing/marketing-ui';

interface ContractorAddOnsProps {
  accentColor?: string;
  variant?: IndustryAddonVariant;
}

export function ContractorAddOns({ accentColor = '#2490ed', variant = 'default' }: ContractorAddOnsProps) {
  const content = industryAddonContent[variant];

  return (
    <>
      <section className={marketingSection}>
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 inline-flex items-center rounded-full border border-[#2490ed]/30 bg-[#2490ed]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#7ec5ff] uppercase">
            {content.eyebrow}
          </p>
          <h2 className={marketingSectionTitle}>
            {content.title}{' '}
            <span style={{ color: accentColor }}>{content.titleAccent}</span>
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">{content.body}</p>
          <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2490ed] via-[#5eb3ff] to-[#00d4aa]" aria-hidden />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.panels.map((panel) => (
            <div key={panel.name} className={`p-5 ${marketingPanel}`}>
              <div className={`mb-3 ${marketingIconWrap}`} style={{ color: accentColor }}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-white/90">{panel.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">{panel.requirement}</p>
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
                  <Briefcase className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                  <span className="text-sm font-medium text-white/75">{upgrade.base}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/35">+</span>
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold"
                    style={{
                      background: `${accentColor}20`,
                      color: accentColor,
                      borderColor: `${accentColor}40`,
                    }}
                  >
                    {upgrade.addon}
                  </span>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-white/25 sm:block" aria-hidden />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34d399]" aria-hidden />
                  <span className="text-sm text-white/62">{upgrade.benefit}</span>
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
