import { ArrowRight, Briefcase, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import {
  cleanerUpgrades,
  industryAddonContent,
  type IndustryAddonVariant,
} from '@/lib/marketing/industry-page-data';

interface ContractorAddOnsProps {
  accentColor?: string;
  variant?: IndustryAddonVariant;
}

export function ContractorAddOns({ variant = 'default' }: ContractorAddOnsProps) {
  const content = industryAddonContent[variant];

  return (
    <>
      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>{content.eyebrow}</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            {content.title} {content.titleAccent}
          </h2>
          <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>{content.body}</p>

          <ol className="mt-12 divide-y divide-slate-200/80 border-y border-slate-200/80">
            {content.panels.map((panel, index) => (
              <li key={panel.name} className="grid gap-3 py-7 sm:grid-cols-[4.5rem_1fr] sm:gap-8">
                <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-slate-300 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                    {panel.name}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{panel.requirement}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {content.showUpgrades ? (
        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>For cleaning contractors</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
              Upgrade your service offering
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              ISSA-aligned cleaning businesses can add IICRC CEC courses to build restoration skills
              and charge for restoration services. CARSI delivers continuing education credits, not
              IICRC certification.
            </p>

            <div className="mt-10 space-y-3">
              {cleanerUpgrades.map((upgrade) => (
                <div
                  key={upgrade.base}
                  className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="text-sm font-medium text-slate-950">{upgrade.base}</span>
                  </div>
                  <span className="text-xs text-slate-400">+</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-[#146fc2]">
                    {upgrade.addon}
                  </span>
                  <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" aria-hidden />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span className="text-sm text-slate-500">{upgrade.benefit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
              >
                Browse CEC courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pathways"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800"
              >
                View learning pathways
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
