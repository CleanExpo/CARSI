import { PlatformContextualNext } from '@/components/marketing/platform/PlatformPagePattern';
import { RoleGuidesHubGrid, RoleGuidesHubHero } from '@/components/marketing/RoleGuidesHub';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';
import { OG_IMAGES } from '@/lib/seo/og-image';
import type { Metadata } from 'next';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'Role-specific training guides',
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
      <RoleGuidesHubHero />
      <RoleGuidesHubGrid />
      <PlatformContextualNext current={ROLE_GUIDES_HUB_PATH} />
      <StaticMarketingClosingCta />
    </>
  );
}
