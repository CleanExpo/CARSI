import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';

const catalogue = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../data/seed/courses-catalog.json'),
    'utf8'
  )
) as CoursesCatalogFile;

// CI seeds this exact file. Fail during test collection if a chosen journey
// fixture is missing or draft, rather than expecting a hidden course in the UI.
export function publishedCourseFixture(slug: string) {
  const course = catalogue.courses.find((candidate) => candidate.slug === slug);
  if (!course || course.status.toLowerCase() !== 'published') {
    throw new Error(`Catalogue journey fixture must be published: ${slug}`);
  }
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    price_aud: course.priceAud,
    is_free: course.isFree,
    category: course.category,
    short_description: course.shortDescription,
  };
}

export const WATER_COURSE = publishedCourseFixture('wrt-water-damage-essentials');
export const NON_WATER_COURSE = publishedCourseFixture(
  'air-quality-and-odour-identification-and-deodorisation-essentials'
);
export const CARPET_COURSE = publishedCourseFixture(
  'introduction-to-basic-carpet-cleaning-and-drying'
);
