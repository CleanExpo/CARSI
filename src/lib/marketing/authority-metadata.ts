import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';
import type { AuthorityPageEntry } from '@/lib/marketing/authority-pages';

/** Metadata for a /for/<industry> page. Indexable only when the registry says `approved`. */
export function buildAuthorityMetadata(entry: AuthorityPageEntry): Metadata {
  const siteUrl = getPublicSiteUrl();
  const url = `${siteUrl}/for/${entry.slug}`;
  const indexable = entry.status === 'approved';

  return {
    title: entry.title,
    description: entry.metaDescription,
    keywords: entry.keywords,
    robots: { index: indexable, follow: indexable },
    alternates: { canonical: url },
    openGraph: { title: entry.title, description: entry.metaDescription, type: 'website', url },
  };
}
