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
import { prisma } from '@/lib/prisma';
import { DEFAULT_INSTRUCTOR_ID, ensureCatalogInstructor } from '@/lib/server/course-catalog-sync';

type ParsedModule = { title: string; bodyText: string };
type ParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  iicrcDiscipline: string | null;
  overviewParagraphs: string[];
  modules: ParsedModule[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT_PATH = join(__dirname, '..', 'data', 'CARSI_Specialty_Courses_Collection.txt');
const TX_OPTS = { maxWait: 15_000, timeout: 180_000 } as const;

const COURSE_HEAD = /^COURSE\s+(\d+)\s*$/i;
const MODULE_HEAD = /^MODULE\s+(\d+):\s*(.+)$/i;
const WHAT_YOU_LEARN = /^WHAT YOU WILL LEARN\b/i;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return base || `course-${randomUUID().slice(0, 8)}`;
}

function parsePriceLine(line: string): { priceAud: number; isFree: boolean; iicrcDiscipline: string | null } {
  const t = line.trim();
  const free = /Price:\s*Free\b/i.test(t);
  const n = t.match(/Price:\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i);
  const priceAud = free ? 0 : n ? Number.parseFloat(n[1] ?? '0') : 0;
  const d = t.match(/IICRC:\s*([A-Z0-9/,\s-]+)/i);
  return {
    priceAud,
    isFree: free || priceAud === 0,
    iicrcDiscipline: d?.[1]?.trim() ?? null,
  };
}

function isDivider(line: string): boolean {
  return /^={10,}\s*$/.test(line.trim());
}

function parseCollection(raw: string): ParsedCourse[] {
  const lines = raw.split(/\r?\n/);
  const courses: ParsedCourse[] = [];
  let i = 0;

  while (i < lines.length) {
    const head = lines[i]?.trim() ?? '';
    if (!COURSE_HEAD.test(head)) {
      i += 1;
      continue;
    }

    // Skip title line and metadata lines
    i += 1;
    while (i < lines.length && lines[i].trim() === '') i += 1;
    const title = (lines[i] ?? '').trim();
    i += 1;
    const priceLine = (lines[i] ?? '').trim();
    i += 1;
    // Optional role line
    if (/^Role:/i.test(lines[i] ?? '')) i += 1;

    const meta = parsePriceLine(priceLine);

    while (i < lines.length && !/^COURSE OVERVIEW\s*$/i.test(lines[i].trim())) i += 1;
    if (i >= lines.length) break;
    i += 1; // after COURSE OVERVIEW

    const overviewLines: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (COURSE_HEAD.test(t) || MODULE_HEAD.test(t) || WHAT_YOU_LEARN.test(t)) break;
      if (!isDivider(t) && t !== '') overviewLines.push(lines[i]);
      i += 1;
    }

    const modules: ParsedModule[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (COURSE_HEAD.test(t)) break;

      const mm = t.match(MODULE_HEAD);
      if (mm) {
        const moduleTitle = `MODULE ${mm[1]}: ${mm[2]}`.trim();
        i += 1;
        const body: string[] = [];
        while (i < lines.length) {
          const x = lines[i].trim();
          if (COURSE_HEAD.test(x) || MODULE_HEAD.test(x) || WHAT_YOU_LEARN.test(x)) break;
          if (!isDivider(x) && x !== '') body.push(lines[i]);
          i += 1;
        }
        modules.push({ title: moduleTitle, bodyText: body.join('\n\n').trim() });
        continue;
      }

      if (WHAT_YOU_LEARN.test(t)) {
        i += 1;
        const body: string[] = [];
        while (i < lines.length) {
          const x = lines[i].trim();
          if (COURSE_HEAD.test(x)) break;
          if (!isDivider(x) && x !== '') body.push(lines[i]);
          i += 1;
        }
        if (body.length > 0) {
          modules.push({
            title: 'WHAT YOU WILL LEARN',
            bodyText: body.join('\n\n').trim(),
          });
        }
        continue;
      }

      i += 1;
    }

    if (title) {
      courses.push({
        title,
        slug: slugify(title),
        priceAud: meta.priceAud,
        isFree: meta.isFree,
        iicrcDiscipline: meta.iicrcDiscipline,
        overviewParagraphs: overviewLines,
        modules,
      });
    }
  }
  return courses;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const raw = readFileSync(TXT_PATH, 'utf8');
  const courses = parseCollection(raw);
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

