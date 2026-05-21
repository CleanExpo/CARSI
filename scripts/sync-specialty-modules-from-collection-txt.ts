/**
 * Fix courses that advertise 5/6 modules but only have placeholder content from the
 * Odour/Smoke DOCX seed. Replaces modules from `data/CARSI_Specialty_Courses_Collection.txt`.
 *
 * Usage:
 *   npx tsx scripts/sync-specialty-modules-from-collection-txt.ts --dry-run
 *   npx tsx scripts/sync-specialty-modules-from-collection-txt.ts
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '@/lib/prisma';
import {
  parseSpecialtyCoursesCollectionTxt,
  specialtyCourseBaseTitle,
  slugifySpecialtyCourseTitle,
} from '@/lib/seed/carsi-specialty-courses-collection-txt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT_PATH = join(__dirname, '..', 'data', 'CARSI_Specialty_Courses_Collection.txt');
const TX_OPTS = { maxWait: 15_000, timeout: 180_000 } as const;

function normalizeBase(title: string): string {
  return specialtyCourseBaseTitle(title).toLowerCase();
}

async function replaceCourseModules(
  courseId: string,
  modules: { title: string; bodyText: string }[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.lmsModule.deleteMany({ where: { courseId } });
    for (let idx = 0; idx < modules.length; idx += 1) {
      const m = modules[idx]!;
      await tx.lmsModule.create({
        data: {
          id: randomUUID(),
          courseId,
          title: m.title,
          orderIndex: idx,
          lessons: {
            create: {
              id: randomUUID(),
              title:
                m.title.length > 180 ? `${m.title.slice(0, 177)}… — Reading` : `${m.title} — Reading`,
              contentType: 'text',
              contentBody: m.bodyText || null,
              orderIndex: 0,
              isPreview: idx === 0,
            },
          },
        },
      });
    }
  }, TX_OPTS);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const parsed = parseSpecialtyCoursesCollectionTxt(readFileSync(TXT_PATH, 'utf8'));
  const byBase = new Map(parsed.map((c) => [normalizeBase(c.title), c]));

  const dbCourses = await prisma.lmsCourse.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      isPublished: true,
      _count: { select: { modules: true } },
    },
  });

  const actions: Array<{
    action: string;
    slug: string;
    title: string;
    before: number;
    after: number;
    source: string;
  }> = [];

  for (const row of dbCourses) {
    const base = normalizeBase(row.title);
    const source = byBase.get(base);
    if (!source) continue;

    const targetCount = source.modules.length;
    if (row._count.modules >= targetCount) continue;

    actions.push({
      action: 'sync_modules',
      slug: row.slug,
      title: row.title,
      before: row._count.modules,
      after: targetCount,
      source: 'data/CARSI_Specialty_Courses_Collection.txt',
    });

    if (!dryRun) {
      await replaceCourseModules(row.id, source.modules);
      if (source.overviewParagraphs.length > 0) {
        const description = source.overviewParagraphs.join('\n\n');
        await prisma.lmsCourse.update({
          where: { id: row.id },
          data: {
            description,
            shortDescription: source.overviewParagraphs[0]?.slice(0, 480) ?? null,
            iicrcDiscipline: source.iicrcDiscipline,
          },
        });
      }
    }
  }

  // Unpublish short-slug duplicate when a long catalogue title exists for the same course
  const groups = new Map<string, typeof dbCourses>();
  for (const row of dbCourses) {
    const base = normalizeBase(row.title);
    const list = groups.get(base) ?? [];
    list.push(row);
    groups.set(base, list);
  }

  for (const [base, rows] of groups) {
    if (rows.length < 2 || !byBase.has(base)) continue;
    const canonicalSlug = slugifySpecialtyCourseTitle(byBase.get(base)!.title);
    const shortRow = rows.find((r) => r.slug === canonicalSlug);
    const longRow = rows.find((r) => r.slug !== canonicalSlug && r.title.includes('|'));
    if (!shortRow || !longRow) continue;

    actions.push({
      action: 'unpublish_duplicate_short_slug',
      slug: shortRow.slug,
      title: shortRow.title,
      before: shortRow._count.modules,
      after: shortRow._count.modules,
      source: `duplicate of ${longRow.slug}`,
    });
    if (!dryRun) {
      await prisma.lmsCourse.update({
        where: { id: shortRow.id },
        data: { status: 'draft', isPublished: false },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        dataFile: 'data/CARSI_Specialty_Courses_Collection.txt',
        docxSourceNote:
          'Placeholder courses were seeded from data/CARSI_Odour_Smoke_Psychro_Drying.docx (compact Modules: summary only).',
        actions,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
