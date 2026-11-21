import referencesIndex from '../../../data/seo/course-references.index.json';

import type { CourseReference, CourseReferencesIndex } from './course-references';

const INDEX = referencesIndex as unknown as CourseReferencesIndex;

/** The References list a course page renders; empty when the course cites nothing. */
export function getCourseReferences(slug: string): CourseReference[] {
  return INDEX[slug]?.references ?? [];
}

/** Every course in the index, by slug, with how many references it carries. */
export function courseReferenceCounts(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(INDEX).map(([slug, entry]) => [slug, entry.references.length])
  );
}
