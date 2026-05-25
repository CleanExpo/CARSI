/**
 * Update `lms_courses.cec_hours` from WP export (+ catalog text) where a value is known.
 *
 *   DATABASE_URL="..." npm run db:seed-cec-hours
 *   npm run db:seed-cec-hours -- --overwrite   # replace existing non-null values too
 *   npm run db:seed-cec-hours -- --dry-run
 *
 * Sources (in order per slug):
 * 1. Published WP export rows (enriched with resolveCecHours)
 * 2. `data/seed/courses-catalog.json` courses (text/meta when cecHours null)
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';
import { enrichCourseWithCecHours, resolveCatalogCecHours } from '../src/lib/seed/cec-hours';
import { isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import {
  getPublishedWpImportRows,
  type WpExportCourseRow,
} from '../src/lib/seed/wp-export-published-import-slugs';
import { readWpExportCoursesJsonOrThrow } from '../src/lib/seed/wp-export-courses-json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const overwrite = process.argv.includes('--overwrite');

function buildCecBySlug(): Map<string, number> {
  const map = new Map<string, number>();

  const wpRaw = readWpExportCoursesJsonOrThrow(APP_ROOT);
  const allWp = JSON.parse(wpRaw) as WpExportCourseRow[];
  for (const row of allWp.map((c) => enrichCourseWithCecHours(c))) {
    if (row.cec_hours != null) map.set(row.slug, row.cec_hours);
  }

  const catalogPath = join(APP_ROOT, 'data', 'seed', 'courses-catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown;
  if (isCoursesCatalogFile(catalog)) {
    for (const c of catalog.courses) {
      const hours = resolveCatalogCecHours(c);
      if (hours != null) map.set(c.slug, hours);
    }
  }

  const { rows } = getPublishedWpImportRows(APP_ROOT);
  for (const row of rows.map((c) => enrichCourseWithCecHours(c))) {
    if (row.cec_hours != null) map.set(row.slug, row.cec_hours);
  }

  return map;
}

async function main() {
  const cecBySlug = buildCecBySlug();
  console.log(`Resolved CEC for ${cecBySlug.size} slug(s) from export/catalog.`);

  const courses = await prisma.lmsCourse.findMany({
    select: { id: true, slug: true, title: true, cecHours: true },
  });

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const course of courses) {
    const hours = cecBySlug.get(course.slug);
    if (hours == null) {
      missing++;
      continue;
    }

    const current =
      course.cecHours != null ? Number(course.cecHours) : null;

    if (!overwrite && current != null && Number.isFinite(current)) {
      skipped++;
      continue;
    }

    if (current === hours) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.lmsCourse.update({
        where: { id: course.id },
        data: { cecHours: hours },
      });
    }
    updated++;
    console.log(`  ${course.slug}: ${current ?? '—'} → ${hours}`);
  }

  console.log(
    dryRun
      ? `Dry run: would update ${updated}, skip ${skipped}, no source for ${missing} DB row(s).`
      : `Updated ${updated}, skipped ${skipped}, no source for ${missing} DB row(s).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
