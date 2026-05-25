/**
 * Fill `cec_hours` on `data/wordpress-export/courses.json` from meta + description text.
 *
 *   npm run db:enrich-wp-export-cec
 *   npm run db:enrich-wp-export-cec -- --dry-run
 *
 * Optional: WP_EXPORT_COURSES_PATH=/abs/path/to/courses.json
 */
import 'dotenv/config';

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { enrichCourseWithCecHours } from '../src/lib/seed/cec-hours';
import type { WpExportCourseRow } from '../src/lib/seed/wp-export-published-import-slugs';
import { readWpExportCoursesJsonOrThrow, resolveWpExportCoursesJsonPath } from '../src/lib/seed/wp-export-courses-json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const raw = readWpExportCoursesJsonOrThrow(APP_ROOT);
const courses = JSON.parse(raw) as WpExportCourseRow[];
const enriched = courses.map((c) => enrichCourseWithCecHours(c));

const hadBefore = courses.filter((c) => c.cec_hours != null).length;
const hasAfter = enriched.filter((c) => c.cec_hours != null).length;
const newlySet = enriched.filter((c, i) => c.cec_hours != null && courses[i]?.cec_hours == null).length;

console.log(`Courses: ${courses.length}`);
console.log(`cec_hours before: ${hadBefore} set`);
console.log(`cec_hours after:  ${hasAfter} set (+${newlySet} from text/meta)`);

if (dryRun) {
  console.log('Dry run — file not written.');
  process.exit(0);
}

const outPath = resolveWpExportCoursesJsonPath(APP_ROOT);
writeFileSync(outPath, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
