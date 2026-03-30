import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { SeedLessonModule } from '@/lib/lms-seed-catalog';
import { getSeedCourseFull } from '@/lib/lms-seed-catalog';
import { findCourseInExport } from '@/lib/server/local-course-checkout';

export const DEFAULT_INSTRUCTOR_ID =
  process.env.LMS_SYSTEM_INSTRUCTOR_ID?.trim() ||
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const SYSTEM_INSTRUCTOR_EMAIL = 'system.instructor@carsi.internal';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function ensureCatalogInstructor(): Promise<void> {
  const existing = await prisma.lmsUser.findUnique({ where: { id: DEFAULT_INSTRUCTOR_ID } });
  if (existing) return;

  await prisma.lmsUser.upsert({
    where: { id: DEFAULT_INSTRUCTOR_ID },
    create: {
      id: DEFAULT_INSTRUCTOR_ID,
      email: SYSTEM_INSTRUCTOR_EMAIL,
      hashedPassword: 'catalog:no-password-login',
      fullName: 'CARSI Catalog',
      isActive: true,
      isVerified: true,
    },
    update: {},
  });
}

export const courseWithCurriculum = {
  modules: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      lessons: { orderBy: { orderIndex: 'asc' as const } },
    },
  },
} as const;

export type CourseWithCurriculum = Prisma.LmsCourseGetPayload<{
  include: typeof courseWithCurriculum;
}>;

async function insertSeedModulesTx(
  tx: Prisma.TransactionClient,
  courseId: string,
  modules: SeedLessonModule[]
) {
  for (let i = 0; i < modules.length; i += 1) {
    const m = modules[i];
    const moduleId = randomUUID();
    await tx.lmsModule.create({
      data: {
        id: moduleId,
        courseId,
        title: m.title,
        orderIndex: i,
      },
    });
    await tx.lmsLesson.create({
      data: {
        id: randomUUID(),
        moduleId,
        title: m.lessonTitle,
        contentType: 'text',
        contentBody: m.contentHtml,
        orderIndex: 0,
        isPreview: i === 0,
      },
    });
  }
}

/**
 * Load course from DB or materialise from the LMS seed catalog / legacy export.
 * Seed courses include eight modules with full lesson HTML each.
 */
export async function getOrCreateCourseBySlug(slug: string): Promise<CourseWithCurriculum> {
  const normalized = slug.trim().toLowerCase();

  const seedFull = getSeedCourseFull(normalized);
  if (seedFull) {
    await ensureCatalogInstructor();
    const wp = seedFull.export;
    const priceNum = Number(wp.price_aud);
    const isFree = wp.is_free === true || !Number.isFinite(priceNum) || priceNum <= 0;

    const existing = await prisma.lmsCourse.findUnique({
      where: { slug: normalized },
      include: courseWithCurriculum,
    });

    const needsResync =
      !existing ||
      existing.modules.length !== seedFull.modules.length ||
      existing.modules.reduce((acc, mod) => acc + mod.lessons.length, 0) !== seedFull.modules.length;

    if (existing && !needsResync) {
      return existing;
    }

    if (existing && needsResync) {
      await prisma.$transaction(async (tx) => {
        await tx.lmsModule.deleteMany({ where: { courseId: existing.id } });
        await tx.lmsCourse.update({
          where: { id: existing.id },
          data: {
            title: wp.title,
            description: wp.description ?? null,
            shortDescription: wp.short_description ?? null,
            thumbnailUrl: wp.thumbnail_url ?? null,
            status: 'published',
            priceAud: new Prisma.Decimal(isFree ? 0 : priceNum),
            isFree,
            level: wp.level ?? null,
            category: wp.category ?? null,
            iicrcDiscipline: wp.iicrc_discipline ?? null,
            isPublished: true,
            meta: wp.meta === undefined ? undefined : (wp.meta as Prisma.InputJsonValue),
          },
        });
        await insertSeedModulesTx(tx, existing.id, seedFull.modules);
      });
      return prisma.lmsCourse.findUniqueOrThrow({
        where: { id: existing.id },
        include: courseWithCurriculum,
      });
    }

    const courseId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.lmsCourse.create({
        data: {
          id: courseId,
          slug: normalized,
          title: wp.title,
          description: wp.description ?? null,
          shortDescription: wp.short_description ?? null,
          thumbnailUrl: wp.thumbnail_url ?? null,
          instructorId: DEFAULT_INSTRUCTOR_ID,
          status: 'published',
          priceAud: new Prisma.Decimal(isFree ? 0 : priceNum),
          isFree,
          level: wp.level ?? null,
          category: wp.category ?? null,
          iicrcDiscipline: wp.iicrc_discipline ?? null,
          meta: wp.meta === undefined ? undefined : (wp.meta as Prisma.InputJsonValue),
          isPublished: true,
        },
      });
      await insertSeedModulesTx(tx, courseId, seedFull.modules);
    });

    return prisma.lmsCourse.findUniqueOrThrow({
      where: { id: courseId },
      include: courseWithCurriculum,
    });
  }

  const existingLegacy = await prisma.lmsCourse.findUnique({
    where: { slug: normalized },
    include: courseWithCurriculum,
  });
  if (existingLegacy) return existingLegacy;

  const wp = findCourseInExport(normalized);
  if (!wp) {
    throw new Error('COURSE_NOT_FOUND');
  }

  await ensureCatalogInstructor();

  const courseId = randomUUID();
  const moduleId = randomUUID();
  const lessonId = randomUUID();
  const title = (wp.title ?? normalized).trim() || normalized;
  const priceNum = Number(wp.price_aud);
  const isFree = wp.is_free === true || !Number.isFinite(priceNum) || priceNum <= 0;

  await prisma.$transaction(async (tx) => {
    await tx.lmsCourse.create({
      data: {
        id: courseId,
        slug: normalized,
        title,
        description: wp.description ?? null,
        shortDescription: wp.short_description ?? null,
        thumbnailUrl: wp.thumbnail_url ?? null,
        instructorId: DEFAULT_INSTRUCTOR_ID,
        status: wp.status === 'published' ? 'published' : 'draft',
        priceAud: new Prisma.Decimal(isFree ? 0 : priceNum),
        isFree,
        level: wp.level ?? null,
        category: wp.category ?? null,
        iicrcDiscipline: wp.iicrc_discipline ?? null,
        meta: wp.meta === undefined ? undefined : (wp.meta as Prisma.InputJsonValue),
        isPublished: wp.status === 'published',
      },
    });

    await tx.lmsModule.create({
      data: {
        id: moduleId,
        courseId,
        title: 'Introduction',
        orderIndex: 0,
      },
    });

    await tx.lmsLesson.create({
      data: {
        id: lessonId,
        moduleId,
        title: 'Welcome',
        contentType: 'text',
        contentBody: `<p>Welcome to <strong>${escapeHtml(title)}</strong>. Your enrolment is active; additional modules and lessons appear here as they are published in the catalog.</p>`,
        orderIndex: 0,
        isPreview: false,
      },
    });
  });

  return prisma.lmsCourse.findUniqueOrThrow({
    where: { id: courseId },
    include: courseWithCurriculum,
  });
}
