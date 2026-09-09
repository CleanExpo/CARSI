/**
 * Upsert published rows from `data/wordpress-export/courses.json` into `lms_courses`,
 * excluding courses already covered by `data/seed/courses-catalog.json` (20 pilot courses).
 *
 * Skips Woo products that map to that seed set (title, carsi.com.au/courses/… href, slug prefix,
 * plus both monitoring product slug variants ↔ documenting/reporting seed course).
 * Only `status === "published"` rows are imported (127 as of export after excluding both slugs).
 *
 * Existing rows are updated on metadata only — modules and lessons are not deleted.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run db:seed-wp-export
 *
 * Optional:
 *   WP_EXPORT_COURSES_PATH=/abs/path/to/courses.json — if not using repo default
 *   SEED_INSTRUCTOR_ID=<uuid> — must exist or match first instructor in courses-catalog.json
 *
 * Loads `.env` when present via dotenv/config.
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';
import { isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import {
  getPublishedWpImportRows,
  type WpExportCourseRow,
} from '../src/lib/seed/wp-export-published-import-slugs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const CATALOG_PATH = join(APP_ROOT, 'data', 'seed', 'courses-catalog.json');

const SEED_PASSWORD_PLACEHOLDER = 'catalog:seed-from-json';

function jsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

async function ensureInstructorsFromCatalog() {
  const raw = readFileSync(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!isCoursesCatalogFile(data)) {
    throw new Error(`Invalid ${CATALOG_PATH}: expected courses catalog v1 with instructors[]`);
  }
  for (const u of data.instructors) {
    await prisma.lmsUser.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        hashedPassword: SEED_PASSWORD_PLACEHOLDER,
        isActive: true,
        isVerified: true,
      },
      update: {
        email: u.email,
        fullName: u.fullName,
      },
    });
  }
  return data;
}

export function wpRowToCourseData(
  wp: WpExportCourseRow,
  instructorId: string
): Omit<Prisma.LmsCourseCreateInput, 'slug' | 'id' | 'modules'> {
  const priceNum = Number(wp.price_aud ?? 0);
  const priceAud = new Prisma.Decimal(Number.isFinite(priceNum) ? priceNum : 0);
  const isFree = wp.is_free === true || !Number.isFinite(priceNum) || priceNum <= 0;

  return {
    title: wp.title,
    description: wp.description ?? null,
    shortDescription: wp.short_description ?? null,
    thumbnailUrl: wp.thumbnail_url ?? null,
    instructor: { connect: { id: instructorId } },
    status: 'published',
    priceAud,
    isFree,
    durationHours: wp.duration_hours ?? null,
    level: wp.level ?? null,
    category: wp.category ?? null,
    tags: jsonInput(wp.tags),
    // LICENCE-CRITICAL, BOTH FIELDS FAIL CLOSED. Do not restore `wp.*` here.
    //
    // This function builds a row that is written straight to `lms_courses` and rendered to
    // the public. Reading these two fields from the WooCommerce export bypassed every control
    // the repo has, because both controls live downstream of the seed:
    //
    // MEASURED THROUGH THE ACTUAL CODE PATH, not off the export file — the two disagree, and
    // an earlier version of this comment quoted the file and was wrong on both counts.
    // `getPublishedWpImportRows()` excludes catalogue-overlapping slugs and maps what survives
    // through `enrichCourseWithCecHours`, so only 37 rows reach this function, not the 84
    // published rows in courses.json. Of those 37, on 2026-09-07:
    //
    //  - `iicrcDiscipline`: 5 rows STILL carry one (WRT / ASD) — nothing in the import path
    //    touches this column. THIS IS A LIVE EXPOSURE. The field renders as a visible
    //    "IICRC <acronym>" badge, and migration 20260907010000 nulled it on 35 live courses,
    //    verified against production the same day (35/35). Running this seed with the old
    //    `wp.iicrc_discipline` mapping would have put the badge back on those 5. A migration
    //    is not durable while a seed can write the column back — that is the defect this
    //    pinning closes. Founder ruling 2026-07-10, CLAUDE.md.
    //
    //  - `cecHours`: 0 rows carry a value by the time they arrive — `enrichCourseWithCecHours`
    //    has already resolved every one to null against the registry. So the old
    //    `wp.cec_hours ?? null` mapping was NOT publishing unapproved CEC hours, and any claim
    //    that it was is false; a release reviewer caught exactly that overstatement here.
    //    Pinning to 0 is deliberate DEFENCE IN DEPTH, not a live fix: it removes this function's
    //    dependence on an upstream caller continuing to enrich, and 0 is the documented explicit
    //    opt-out so the resolver never derives a value downstream either. Founder directive
    //    2026-07-09.
    //
    // A course becomes CEC-bearing only when the founder adds it to the approvals registry
    // (`data/seed/cec-approvals.json`), never by being imported. Pinned by
    // scripts/seed-wordpress-export-courses.test.mjs — GP-519.
    iicrcDiscipline: null,
    cecHours: 0,
    meta: jsonInput(wp.meta),
    isPublished: true,
  };
}

async function upsertWpCourse(wp: WpExportCourseRow, instructorId: string): Promise<'created' | 'updated'> {
  const data = wpRowToCourseData(wp, instructorId);
  const existing = await prisma.lmsCourse.findUnique({
    where: { slug: wp.slug },
    select: { id: true },
  });

  if (existing) {
    await prisma.lmsCourse.update({
      where: { id: existing.id },
      data,
    });
    return 'updated';
  }

  await prisma.lmsCourse.create({
    data: {
      id: randomUUID(),
      slug: wp.slug,
      ...data,
    },
  });
  return 'created';
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const catalog = await ensureInstructorsFromCatalog();
  const override = process.env.SEED_INSTRUCTOR_ID?.trim();
  const instructorId = override || catalog.instructors[0]?.id;
  if (!instructorId) {
    console.error('No instructor in courses-catalog.json and SEED_INSTRUCTOR_ID unset.');
    process.exit(1);
  }
  if (override) {
    const inst = await prisma.lmsUser.findUnique({ where: { id: override }, select: { id: true } });
    if (!inst) {
      console.error(`SEED_INSTRUCTOR_ID=${override} not found.`);
      process.exit(1);
    }
  }

  const { rows: toImport, excludeSlugs } = getPublishedWpImportRows(APP_ROOT);

  let created = 0;
  let updated = 0;
  for (const row of toImport) {
    const r = await upsertWpCourse(row, instructorId);
    if (r === 'created') created += 1;
    else updated += 1;
    console.log(`${r}: ${row.slug}`);
  }

  console.log(
    `Done. ${toImport.length} published WooCommerce course(s) (${created} created, ${updated} updated). Excluded ${excludeSlugs.size} slug(s) overlapping seed catalog.`
  );
}

// Run ONLY when invoked as a CLI. Previously `main()` was called at import time, so merely
// importing this module — as a test must, to check the fail-closed fields above — would have
// run a live database seed. Using `pathToFileURL(process.argv[1]).href` rather than a
// `file://` + argv concat, because this checkout's path contains a space and the naive form
// breaks on any path needing percent-encoding (CLAUDE.md).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
