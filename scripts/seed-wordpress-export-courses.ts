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
 *   SEED_INSTRUCTOR_ID=<uuid> — must exist or match first instructor in courses-catalog.json
 *
 * Loads `.env` when present via dotenv/config.
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';
import { isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WP_EXPORT_PATH = join(__dirname, '..', 'data', 'wordpress-export', 'courses.json');
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

const SEED_PASSWORD_PLACEHOLDER = 'catalog:seed-from-json';

const HREF_RE = /carsi\.com\.au\/courses\/([^/"']+)\//g;

type WpExportRow = {
  slug: string;
  title: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string | null;
  status?: string;
  price_aud?: number;
  is_free?: boolean;
  duration_hours?: number | null;
  level?: string | null;
  category?: string | null;
  tags?: unknown;
  iicrc_discipline?: string | null;
  cec_hours?: number | null;
  meta?: unknown;
  wp_id?: number;
};

function jsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugMatch(seedSlug: string, hrefSlug: string): boolean {
  const s = seedSlug.toLowerCase();
  const h = hrefSlug.toLowerCase();
  return s === h || h.startsWith(s) || s.startsWith(h);
}

function buildSeedExclusionWpSlugs(seedSlugs: string[], seedTitles: Set<string>): Set<string> {
  const exclude = new Set<string>();
  const raw = readFileSync(WP_EXPORT_PATH, 'utf8');
  const wp = JSON.parse(raw) as WpExportRow[];

  for (const c of wp) {
    if (seedTitles.has(normTitle(c.title))) {
      exclude.add(c.slug);
    }
    const desc = c.description ?? '';
    let m: RegExpExecArray | null;
    const re = new RegExp(HREF_RE.source, 'g');
    while ((m = re.exec(desc)) !== null) {
      const h = m[1].toLowerCase();
      for (const s of seedSlugs) {
        if (slugMatch(s, h)) exclude.add(c.slug);
      }
    }
  }

  // Product slug omits "on-the" in export; LMS/learn URL uses the longer path.
  exclude.add('introduction-to-monitoring-air-quality-on-the-job-site');
  exclude.add('introduction-to-monitoring-air-quality-job-site');
  return exclude;
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

function wpRowToCourseData(
  wp: WpExportRow,
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
    iicrcDiscipline: wp.iicrc_discipline ?? null,
    cecHours: wp.cec_hours ?? null,
    meta: jsonInput(wp.meta),
    isPublished: true,
  };
}

async function upsertWpCourse(wp: WpExportRow, instructorId: string): Promise<'created' | 'updated'> {
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

  const seedSlugs = catalog.courses.map((c) => c.slug.trim().toLowerCase());
  const seedTitles = new Set(catalog.courses.map((c) => normTitle(c.title)));
  const excludeSlugs = buildSeedExclusionWpSlugs(seedSlugs, seedTitles);

  const wpRaw = readFileSync(WP_EXPORT_PATH, 'utf8');
  const wp = JSON.parse(wpRaw) as WpExportRow[];

  const toImport = wp.filter(
    (c) =>
      !excludeSlugs.has(c.slug) && (c.status ?? '').trim().toLowerCase() === 'published'
  );

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
