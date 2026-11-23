import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';
import { OG_LOCALE_FIELDS } from '@/lib/seo/locale';

export function buildIndustryMetadata(
  slug: string,
  title: string,
  description: string,
  keywords?: string[]
): Metadata {
  const siteUrl = getPublicSiteUrl();
  const path = `/industries/${slug}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${siteUrl}${path}` },
    openGraph: {
      ...OG_LOCALE_FIELDS,
      title,
      description,
      type: 'website',
      url: `${siteUrl}${path}`,
    },
  };
}
