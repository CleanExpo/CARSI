/**
 * Builds data/seo/course-references.index.json — the public References list each course page
 * renders (BACKLOG #22) — from the "Sources for this lesson" blocks in the seed catalogue.
 *
 * Run after any change to a course's lesson sources:
 *   npm run build:course-references
 * src/lib/seo/course-references.test.ts fails while the committed index and the catalogue
 * disagree, so a stale index cannot ship.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildCourseReferencesIndex,
  type CatalogueCourseForReferences,
} from '../src/lib/seo/course-references';

export const CATALOGUE_PATH = join('data', 'seed', 'courses-catalog.json');
export const INDEX_PATH = join('data', 'seo', 'course-references.index.json');

export function serialiseIndex(root = process.cwd()): string {
  const catalogue = JSON.parse(readFileSync(join(root, CATALOGUE_PATH), 'utf8')) as {
    courses: CatalogueCourseForReferences[];
  };
  return `${JSON.stringify(buildCourseReferencesIndex(catalogue.courses), null, 2)}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = serialiseIndex();
  writeFileSync(join(process.cwd(), INDEX_PATH), text);
  const index = JSON.parse(text) as Record<string, { references: unknown[] }>;
  for (const [slug, entry] of Object.entries(index)) {
    console.log(`${slug}: ${entry.references.length} references`);
  }
  console.log(`Wrote ${INDEX_PATH} (${Object.keys(index).length} courses).`);
}
