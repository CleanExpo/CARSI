/**
 * Seed all Air Quality courses from `data/air_quality_courses.docx` into the LMS.
 * Extracts every non-empty paragraph from Word XML (no summarisation).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-air-quality-docx.ts
 *   DATABASE_URL="..." npx tsx scripts/seed-air-quality-docx.ts --replace   # delete existing by slug, then insert
 *   npx tsx scripts/seed-air-quality-docx.ts --dry-run
 *
 * Loads `.env` when present.
 */
import 'dotenv/config';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { adminCreateCourse } from '@/lib/admin/admin-courses-service';
import { prisma } from '@/lib/prisma';
import {
  extractDocxParagraphs,
  parseAirQualityCompendium,
  paragraphsToLessonHtml,
} from '@/lib/seed/air-quality-docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCX_PATH = join(__dirname, '..', 'data', 'air_quality_courses.docx');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const replace = process.argv.includes('--replace');

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const paras = extractDocxParagraphs(DOCX_PATH);
  const courses = parseAirQualityCompendium(paras);

  console.log(`Extracted ${paras.length} paragraphs, ${courses.length} courses.`);

  for (const c of courses) {
    const modCount = c.modules.length;
    const paraCount =
      c.overviewParagraphs.length + c.modules.reduce((n, m) => n + m.bodyParagraphs.length, 0);
    console.log(`  — ${c.title} (${c.slug}) modules=${modCount} content paras=${paraCount}`);
  }

  if (dryRun) {
    console.log('Dry run: no database writes.');
    return;
  }

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

    const descriptionHtml =
      c.overviewParagraphs.length > 0 ? paragraphsToLessonHtml(c.overviewParagraphs) : undefined;

    const created = await adminCreateCourse({
      title: c.title,
      description: descriptionHtml,
      thumbnailUrl: undefined,
      introVideoUrl: undefined,
      introThumbnailUrl: undefined,
      slug: c.slug,
      isFree: false,
      priceAud: c.priceAud,
      published: true,
      modules: c.modules.map((m) => ({
        title: m.title,
        textContent: paragraphsToLessonHtml(m.bodyParagraphs),
      })),
    });

    await prisma.lmsCourse.update({
      where: { id: created.id },
      data: {
        category: 'Air Quality',
        shortDescription: c.overviewParagraphs[0]?.slice(0, 480) ?? null,
      },
    });

    console.log(`Created: ${c.slug} (${created.id})`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
