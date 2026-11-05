import { cache } from 'react';

import { getAuthorityPage, type AuthorityPageEntry } from '@/lib/marketing/authority-pages';
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
