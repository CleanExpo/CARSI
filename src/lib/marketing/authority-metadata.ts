import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  isAuthorityPagePublishable,
  type AuthorityPageEntry,
} from '@/lib/marketing/authority-pages';
import { getIndustryCoursesBySlugs } from '@/lib/server/industry-courses';

/**
 * Metadata for a /for/<industry> page. Indexable only when `isAuthorityPagePublishable` passes
 * against `liveSlugs`, the published course slugs read from the database.
 */
export function buildAuthorityMetadata(
  entry: AuthorityPageEntry,
  liveSlugs: ReadonlySet<string>,
  now: Date = new Date()
): Metadata {
  const siteUrl = getPublicSiteUrl();
  const url = `${siteUrl}/for/${entry.slug}`;
  const indexable = isAuthorityPagePublishable(entry, liveSlugs, now);

  return {
    title: entry.title,
    description: entry.metaDescription,
    keywords: entry.keywords,
    robots: { index: indexable, follow: indexable },
    alternates: { canonical: url },
    openGraph: { title: entry.title, description: entry.metaDescription, type: 'website', url },
  };
}

/**
 * Page metadata with the live course list. A draft needs no database read. For an approved entry
 * a failed read is logged and the page stays noindex: it never reads as "all courses published".
 */
export async function authorityMetadata(entry: AuthorityPageEntry): Promise<Metadata> {
  if (entry.status !== 'approved') return buildAuthorityMetadata(entry, new Set());
  let liveSlugs: ReadonlySet<string> = new Set();
  try {
    const courses = await getIndustryCoursesBySlugs(entry.bundle.publishedSlugs);
    liveSlugs = new Set(courses.map((c) => c.slug));
  } catch (error) {
    console.error(`[authority-metadata] course read failed for /for/${entry.slug}; noindex`, error);
  }
  return buildAuthorityMetadata(entry, liveSlugs);
}
