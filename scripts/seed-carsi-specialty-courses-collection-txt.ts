/**
 * Seed from `data/CARSI_Specialty_Courses_Collection.txt`.
 *
 * Behavior:
 * - Parse COURSE blocks (`COURSE 1`, `COURSE 2`, ...)
 * - Parse COURSE OVERVIEW + MODULE sections + WHAT YOU WILL LEARN
 * - Remove existing course by slug first, then recreate (idempotent replace)
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/seed-carsi-specialty-courses-collection-txt.ts
 *   DATABASE_URL="..." npx tsx scripts/seed-carsi-specialty-courses-collection-txt.ts --dry-run
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '@/generated/prisma/client';
import { parseSpecialtyCoursesCollectionTxt } from '@/lib/seed/carsi-specialty-courses-collection-txt';
import { prisma } from '@/lib/prisma';
import { DEFAULT_INSTRUCTOR_ID, ensureCatalogInstructor } from '@/lib/server/course-catalog-sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT_PATH = join(__dirname, '..', 'data', 'CARSI_Specialty_Courses_Collection.txt');
const TX_OPTS = { maxWait: 15_000, timeout: 180_000 } as const;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const raw = readFileSync(TXT_PATH, 'utf8');
  const courses = parseSpecialtyCoursesCollectionTxt(raw);
  console.log(`Parsed CARSI_Specialty_Courses_Collection.txt → ${courses.length} courses.`);
  for (const c of courses) {
    console.log(
      `  — ${c.title} (${c.slug}) modules=${c.modules.length} free=${c.isFree} discipline=${c.iicrcDiscipline ?? '-'}`
    );
  }
  if (dryRun) {
    console.log('Dry run: no database writes.');
    return;
  }

  await ensureCatalogInstructor();

  for (const c of courses) {
    const existing = await prisma.lmsCourse.findUnique({
      where: { slug: c.slug },
      select: { id: true },
    });

    if (existing) {
      await prisma.lmsCourse.delete({ where: { id: existing.id } });
      console.log(`Removed existing: ${c.slug}`);
    }

    const description = c.overviewParagraphs.length > 0 ? c.overviewParagraphs.join('\n\n') : null;
    const shortDescription = c.overviewParagraphs[0]?.slice(0, 480) ?? null;

    await prisma.$transaction(
      async (tx) => {
        await tx.lmsCourse.create({
          data: {
            id: randomUUID(),
            slug: c.slug,
            title: c.title,
            description,
            shortDescription,
            thumbnailUrl: null,
            instructorId: DEFAULT_INSTRUCTOR_ID,
            status: 'published',
            priceAud: new Prisma.Decimal(Number.isFinite(c.priceAud) ? c.priceAud : 0),
            isFree: c.isFree,
            category: 'CARSI Specialty Courses Collection',
            iicrcDiscipline: c.iicrcDiscipline,
            isPublished: true,
            modules: {
              create: c.modules.map((m, idx) => ({
                id: randomUUID(),
                title: m.title,
                orderIndex: idx,
                lessons: {
                  create: {
                    id: randomUUID(),
                    title: `${m.title} — Reading`,
                    contentType: 'text',
                    contentBody: m.bodyText || null,
                    orderIndex: 0,
                    isPreview: idx === 0,
                  },
                },
              })),
            },
          },
        });
      },
      TX_OPTS
    );
    console.log(`Created: ${c.slug}`);
  }

  console.log('Seeding complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

