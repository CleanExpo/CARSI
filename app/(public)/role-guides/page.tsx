import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { authorityForNavItems } from '@/lib/marketing/authority-for-nav';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'Role-specific training guides | CARSI',
  description:
    'Source-backed CARSI guides for builders, insurers, facility teams, healthcare, strata and cleaning contractors — each linking live courses for that job.',
  alternates: { canonical: `${siteUrl}${ROLE_GUIDES_HUB_PATH}` },
  openGraph: {
    title: 'Role-specific training guides | CARSI',
    description:
      'Source-backed guides that connect each audience to live CARSI courses and Australian primary sources.',
    type: 'website',
    url: `${siteUrl}${ROLE_GUIDES_HUB_PATH}`,
    images: OG_IMAGES,
  },
};

export default function ForRoleGuidesHubPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_90%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>CARSI Authority Machine</p>
          <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            Training guides written for the role you hire for
          </h1>
          <p className={`mt-5 max-w-3xl text-pretty ${LANDING_LEAD_CLASS}`}>
            Each guide links live courses, cites primary Australian sources, and states what CARSI
            does and does not claim. Guides stay out of search until they pass approval and
            catalogue checks.
          </p>
          <PlatformNav current={ROLE_GUIDES_HUB_PATH} />
          <p className="mt-8 text-sm text-slate-600">
            <Link
              href="/authority"
              className="font-semibold text-[#146fc2] underline-offset-4 hover:underline"
            >
              CARSI Authority Hub
            </Link>
            {' — citation assets, research intake and machine-readable references.'}
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Six audiences</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>Choose your guide</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authorityForNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-[#2490ed]/35"
                >
                  <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                  <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 group-hover:text-[#146fc2]">
                    {item.audience}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {item.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#146fc2]">
                    Open guide
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <StaticMarketingClosingCta />
    </>
  );
}
