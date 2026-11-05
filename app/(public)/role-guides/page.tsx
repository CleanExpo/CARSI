import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  PlatformContextualNext,
  PlatformPageHeroFromSurface,
  PlatformPageSection,
} from '@/components/marketing/platform/PlatformPagePattern';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
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
      <PlatformPageHeroFromSurface
        current={ROLE_GUIDES_HUB_PATH}
        variant="editorial"
        glow="right"
        actions={
          <>
            <Link
              href="/authority"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
            >
              Authority Hub
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/courses"
              className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
            >
              Browse courses
            </Link>
          </>
        }
        aside={
          <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#146fc2] uppercase">
              Approval & search
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Guides stay noindex until Phill approves copy and bundle courses pass catalogue
              checks. Draft pages show a preview banner — never internal-only language in public
              HTML.
            </p>
          </div>
        }
      />

      <PlatformPageSection
        id="role-guide-grid"
        eyebrow="Six audiences"
        title="Pick the job title you hire for"
        tone="white"
        layout="wide"
      >
        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {authorityForNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 shadow-sm transition hover:border-[#2490ed]/40 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-6 w-6 text-[#146fc2]" aria-hidden />
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase ring-1 ring-slate-200/80">
                    Guide
                  </span>
                </div>
                <p className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950 group-hover:text-[#146fc2]">
                  {item.audience}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.summary}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#146fc2]">
                  Open guide
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </PlatformPageSection>

      <PlatformContextualNext current={ROLE_GUIDES_HUB_PATH} />
      <StaticMarketingClosingCta />
    </>
  );
}
