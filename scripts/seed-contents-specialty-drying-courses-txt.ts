/**
 * Seed from `data/CONTENTS & SPECIALTY DRYING COURSES.txt` (COURSE N OF M + MODULE K: format).
 * Lesson bodies are plain text (no HTML).
 *
 *   DATABASE_URL="..." npx tsx scripts/seed-contents-specialty-drying-courses-txt.ts
 *   DATABASE_URL="..." npx tsx scripts/seed-contents-specialty-drying-courses-txt.ts --replace
 *   npx tsx scripts/seed-contents-specialty-drying-courses-txt.ts --dry-run
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '@/generated/prisma/client';
import { parseWaterDamageRestorationTxt } from '@/lib/seed/water-damage-txt';
import { prisma } from '@/lib/prisma';
import { DEFAULT_INSTRUCTOR_ID, ensureCatalogInstructor } from '@/lib/server/course-catalog-sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT_PATH = join(__dirname, '..', 'data', 'CONTENTS & SPECIALTY DRYING COURSES.txt');

const TX_OPTS = { maxWait: 15_000, timeout: 120_000 } as const;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const replace = process.argv.includes('--replace');

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const raw = readFileSync(TXT_PATH, 'utf8');
  const courses = parseWaterDamageRestorationTxt(raw);

  console.log(`Parsed CONTENTS & SPECIALTY DRYING COURSES.txt → ${courses.length} courses.`);

  for (const c of courses) {
    const chars =
      c.overviewParagraphs.join('').length +
      c.modules.reduce((n, m) => n + m.bodyText.length, 0);
    console.log(`  — ${c.title} (${c.slug})  modules=${c.modules.length}  free=${c.isFree}  chars=${chars}`);
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
            category: 'Contents & Specialty Drying',
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
