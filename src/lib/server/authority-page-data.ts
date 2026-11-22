import { cache } from 'react';

import {
  authorityPages,
  getAuthorityPage,
  isAuthorityPagePublishable,
  type AuthorityPageEntry,
} from '@/lib/marketing/authority-pages';
import { roleGuidePagePath } from '@/lib/marketing/role-guides-path';
import {
  getIndustryCoursesBySlugs,
  type IndustryCourseItem,
} from '@/lib/server/industry-courses';

/**
 * One cached read per request for a /for/<slug> page (grid + metadata when approved).
 */
export const loadAuthorityPageCourses = cache(
  async (pageSlug: string): Promise<{ entry: AuthorityPageEntry; courses: IndustryCourseItem[] }> => {
    const entry = getAuthorityPage(pageSlug);
    const courses = await getIndustryCoursesBySlugs(entry.bundle.publishedSlugs);
    return { entry, courses };
  }
);

/**
 * GP-695: sitemap paths for publishable /for/ pages, decided by the same course read the page and
 * its metadata use (each bundle read by slug), not a newest-N catalogue window. A draft needs no
 * read; a failed read leaves that page out.
 */
export async function publishableAuthorityPaths(
  pages: AuthorityPageEntry[] = authorityPages,
  now: Date = new Date()
): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of pages) {
    if (entry.status !== 'approved') continue;
    try {
      const courses = await getIndustryCoursesBySlugs(entry.bundle.publishedSlugs);
      if (isAuthorityPagePublishable(entry, new Set(courses.map((c) => c.slug)), now)) {
        paths.push(roleGuidePagePath(entry.slug));
      }
    } catch (error) {
      console.error(`[sitemap] course read failed for ${roleGuidePagePath(entry.slug)}; left out`, error);
    }
  }
  return paths;
}
