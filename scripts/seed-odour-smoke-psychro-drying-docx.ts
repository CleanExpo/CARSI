/**
 * Seed courses from `data/CARSI_Odour_Smoke_Psychro_Drying.docx`.
 * Lesson bodies are plain text (no HTML).
 *
 *   DATABASE_URL="..." npx tsx scripts/seed-odour-smoke-psychro-drying-docx.ts
 *   DATABASE_URL="..." npx tsx scripts/seed-odour-smoke-psychro-drying-docx.ts --replace
 *   npx tsx scripts/seed-odour-smoke-psychro-drying-docx.ts --dry-run
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '@/generated/prisma/client';
import { extractDocxParagraphs } from '@/lib/seed/docx-extract';
import { parseOdourSmokePsychroDryingCompendium } from '@/lib/seed/odour-smoke-psychro-drying-docx';
import { prisma } from '@/lib/prisma';
import { DEFAULT_INSTRUCTOR_ID, ensureCatalogInstructor } from '@/lib/server/course-catalog-sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCX_PATH = join(__dirname, '..', 'data', 'CARSI_Odour_Smoke_Psychro_Drying.docx');

const TX_OPTS = { maxWait: 15_000, timeout: 120_000 } as const;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const replace = process.argv.includes('--replace');

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const paras = extractDocxParagraphs(DOCX_PATH);
  const courses = parseOdourSmokePsychroDryingCompendium(paras);

  console.log(`Extracted ${paras.length} paragraphs → ${courses.length} courses.`);

  for (const c of courses) {
    const chars =
      c.overviewParagraphs.join('').length +
      c.modules.reduce((n, m) => n + m.bodyText.length, 0);
    console.log(
      `  — ${c.title} (${c.slug})  modules=${c.modules.length}  free=${c.isFree}  chars=${chars}`
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
      if (!replace) {
        console.log(`Skip (exists): ${c.slug}`);
        continue;
      }
      await prisma.lmsCourse.delete({ where: { id: existing.id } });
      console.log(`Replaced: ${c.slug}`);
    }

    const description =
      c.overviewParagraphs.length > 0 ? c.overviewParagraphs.join('\n\n') : null;

    const price = Number.isFinite(c.priceAud) ? c.priceAud : 0;

    await prisma.$transaction(
      async (tx) => {
        const courseId = randomUUID();
        await tx.lmsCourse.create({
          data: {
            id: courseId,
            slug: c.slug,
            title: c.title,
            description,
            shortDescription: c.overviewParagraphs[0]?.slice(0, 480) ?? null,
            thumbnailUrl: null,
            instructorId: DEFAULT_INSTRUCTOR_ID,
            status: 'published',
            priceAud: new Prisma.Decimal(price),
            isFree: c.isFree,
            category: 'Odour, Smoke, Psychrometry & Drying',
            iicrcDiscipline: c.iicrcDiscipline,
            isPublished: true,
            modules: {
              create: c.modules.map((m, orderIndex) => ({
                id: randomUUID(),
                title: m.title,
                orderIndex,
                lessons: {
                  create: {
                    id: randomUUID(),
                    title:
                      m.title.length > 180 ? `${m.title.slice(0, 177)}… — Reading` : `${m.title} — Reading`,
                    contentType: 'text',
                    contentBody: m.bodyText.length > 0 ? m.bodyText : null,
                    orderIndex: 0,
                    isPreview: orderIndex === 0,
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

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
