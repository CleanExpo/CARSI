/**
 * Export LMS courses (and curriculum) from Postgres into `data/seed/courses-catalog.json`.
 *
 * Usage (local DB with real data):
 *   npm run db:export-courses
 *   npm run db:export-courses -- --all
 *
 * `--all` exports every row in `lms_courses`. Default exports only published catalogue courses
 * (same filter as the public /courses page).
 *
 * Requires DATABASE_URL. Loads `.env` via dotenv/config.
 */
import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';
import type { CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import { COURSES_CATALOG_VERSION } from '../src/lib/seed/courses-catalog-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

const publishedWhere = {
  OR: [{ isPublished: true }, { status: { equals: 'published', mode: 'insensitive' as const } }],
};

async function main() {
  const all = process.argv.includes('--all');
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const courses = await prisma.lmsCourse.findMany({
    where: all ? undefined : publishedWhere,
    orderBy: { slug: 'asc' },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });

  const instructorIds = [...new Set(courses.map((c) => c.instructorId))];
  const instructors = await prisma.lmsUser.findMany({
    where: { id: { in: instructorIds } },
    select: { id: true, email: true, fullName: true },
  });

  const payload: CoursesCatalogFile = {
    version: COURSES_CATALOG_VERSION,
    exportedAt: new Date().toISOString(),
    publishedOnly: !all,
    instructors: instructors.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      shortDescription: c.shortDescription,
      thumbnailUrl: c.thumbnailUrl,
      instructorId: c.instructorId,
      status: c.status,
      priceAud: c.priceAud.toString(),
      isFree: c.isFree,
      durationHours: c.durationHours,
      level: c.level,
      category: c.category,
      tags: c.tags,
      iicrcDiscipline: c.iicrcDiscipline,
      cecHours: c.cecHours,
      meta: c.meta,
      isPublished: c.isPublished,
      modules: c.modules.map((m) => ({
        id: m.id,
        title: m.title,
        orderIndex: m.orderIndex,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          contentType: l.contentType,
          contentBody: l.contentBody,
          orderIndex: l.orderIndex,
          isPreview: l.isPreview,
          resources: l.resources,
        })),
      })),
    })),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${courses.length} course(s), ${instructors.length} instructor(s) → ${OUT} (${all ? 'all rows' : 'published catalogue only'})`
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
