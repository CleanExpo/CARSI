import type { CoursesCatalogFile } from '@/lib/seed/courses-catalog-types';

import catalog from '../../../data/seed/courses-catalog.json';

const bySlug = new Map(
  (catalog as CoursesCatalogFile).courses.map((course) => [course.slug, course])
);

/** Display title for a catalogue slug (seed JSON, safe in Next server bundles). */
export function catalogueCourseTitle(slug: string): string {
  return bySlug.get(slug)?.title ?? slug.replace(/-/g, ' ');
}

export function catalogueCourseStatus(slug: string): string | undefined {
  return bySlug.get(slug)?.status;
}
