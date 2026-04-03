/**
 * Upsert LMS courses from `data/seed/courses-catalog.json` into Postgres (e.g. remote server).
 * Idempotent per course slug: replaces modules/lessons to match the JSON snapshot.
 *
 * Usage (target DB):
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses
 *
 * Optional:
 *   SEED_INSTRUCTOR_ID=<uuid> — force every course to use this instructor (must exist or be listed in JSON).
 *
 * Loads `.env` when present via dotenv/config.
 *
 * Suggested deploy:
 *   npx prisma migrate deploy && npm run db:seed-courses && npm run start
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
import type { CatalogCourse, CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import { COURSES_CATALOG_VERSION, isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

const SEED_PASSWORD_PLACEHOLDER = 'catalog:seed-from-json';

function jsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

async function ensureInstructors(data: CoursesCatalogFile) {
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
}

async function deleteCourseCurriculum(tx: PrismaTx, courseId: string) {
  const modules = await tx.lmsModule.findMany({
    where: { courseId },
    select: { id: true },
  });
  const moduleIds = modules.map((m) => m.id);
  if (moduleIds.length === 0) return;

  const lessons = await tx.lmsLesson.findMany({
    where: { moduleId: { in: moduleIds } },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    await tx.lmsLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
  }

  await tx.lmsModule.deleteMany({ where: { courseId } });
}

async function seedCourse(c: CatalogCourse, instructorOverride: string | undefined) {
  const instructorId = instructorOverride?.trim() || c.instructorId;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.lmsCourse.findUnique({
      where: { slug: c.slug },
      select: { id: true },
    });
    const courseId = existing?.id ?? c.id;

    await deleteCourseCurriculum(tx, courseId);

    const priceAud = new Prisma.Decimal(c.priceAud);

    await tx.lmsCourse.upsert({
      where: { slug: c.slug },
      create: {
        id: courseId,
        slug: c.slug,
        title: c.title,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        instructorId,
        status: c.status,
        priceAud,
        isFree: c.isFree,
        durationHours: c.durationHours,
        level: c.level,
        category: c.category,
        tags: jsonInput(c.tags),
        iicrcDiscipline: c.iicrcDiscipline,
        cecHours: c.cecHours,
        meta: jsonInput(c.meta),
        isPublished: c.isPublished,
        modules: {
          create: c.modules.map((m) => ({
            id: m.id,
            title: m.title,
            orderIndex: m.orderIndex,
            lessons: {
              create: m.lessons.map((l) => ({
                id: l.id,
                title: l.title,
                contentType: l.contentType,
                contentBody: l.contentBody,
                orderIndex: l.orderIndex,
                isPreview: l.isPreview,
                resources: jsonInput(l.resources),
              })),
            },
          })),
        },
      },
      update: {
        title: c.title,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        instructorId,
        status: c.status,
        priceAud,
        isFree: c.isFree,
        durationHours: c.durationHours,
        level: c.level,
        category: c.category,
        tags: jsonInput(c.tags),
        iicrcDiscipline: c.iicrcDiscipline,
        cecHours: c.cecHours,
        meta: jsonInput(c.meta),
        isPublished: c.isPublished,
      },
    });

    if (existing) {
      for (const m of c.modules) {
        await tx.lmsModule.create({
          data: {
            id: m.id,
            courseId,
            title: m.title,
            orderIndex: m.orderIndex,
            lessons: {
              create: m.lessons.map((l) => ({
                id: l.id,
                title: l.title,
                contentType: l.contentType,
                contentBody: l.contentBody,
                orderIndex: l.orderIndex,
                isPreview: l.isPreview,
                resources: jsonInput(l.resources),
              })),
            },
          },
        });
      }
    }
  });
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const raw = readFileSync(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!isCoursesCatalogFile(data)) {
    console.error(
      `Invalid catalog: expected version ${COURSES_CATALOG_VERSION} with instructors[] and courses[].`
    );
    process.exit(1);
  }

  if (data.courses.length === 0) {
    console.log('No courses in catalog; nothing to seed. Run db:export-courses locally and commit JSON.');
    return;
  }

  const override = process.env.SEED_INSTRUCTOR_ID?.trim();

  await ensureInstructors(data);

  if (override) {
    const inst = await prisma.lmsUser.findUnique({ where: { id: override }, select: { id: true } });
    if (!inst) {
      console.error(`SEED_INSTRUCTOR_ID=${override} not found. Create that user or omit override.`);
      process.exit(1);
    }
  }

  for (const c of data.courses) {
    await seedCourse(c, override);
    console.log(`Seeded course: ${c.slug}`);
  }

  console.log(`Done. ${data.courses.length} course(s) from ${CATALOG_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
