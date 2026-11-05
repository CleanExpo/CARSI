import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';
import { ROLE_GUIDES_HUB_PATH, roleGuidePagePath } from '@/lib/marketing/role-guides-path';
import { authorityPageLatestVerified } from '@/lib/marketing/authority-for-nav';
import {
  isAuthorityPagePublishable,
  type AuthorityPageEntry,
} from '@/lib/marketing/authority-pages';
import { OG_IMAGES, OG_IMAGE_URLS } from '@/lib/seo/og-image';
import { loadAuthorityPageCourses } from '@/lib/server/authority-page-data';

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
  const url = `${siteUrl}${roleGuidePagePath(entry.slug)}`;
  const indexable = isAuthorityPagePublishable(entry, liveSlugs, now);

  return {
    title: entry.title,
    description: entry.metaDescription,
    keywords: entry.keywords,
    robots: { index: indexable, follow: indexable },
    alternates: { canonical: url },
    openGraph: {
      title: entry.title,
      description: entry.metaDescription,
      type: 'website',
      url,
      images: OG_IMAGES,
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.metaDescription,
      images: OG_IMAGE_URLS,
    },
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
    const { courses } = await loadAuthorityPageCourses(entry.slug);
    liveSlugs = new Set(courses.map((c) => c.slug));
  } catch (error) {
    console.error(`[authority-metadata] course read failed for ${roleGuidePagePath(entry.slug)}; noindex`, error);
  }
  const base = buildAuthorityMetadata(entry, liveSlugs);
  const verified = authorityPageLatestVerified(entry);
  return {
    ...base,
    other: { 'article:modified_time': verified },
  };
}
