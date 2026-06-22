import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

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
      title,
      description,
      type: 'website',
      url: `${siteUrl}${path}`,
    },
  };
}
