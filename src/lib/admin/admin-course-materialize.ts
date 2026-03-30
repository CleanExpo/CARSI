import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { loadAdminCatalogFromXlsx } from '@/lib/admin/load-admin-catalog';
import {
  courseWithCurriculum,
  DEFAULT_INSTRUCTOR_ID,
  ensureCatalogInstructor,
  type CourseWithCurriculum,
} from '@/lib/server/course-catalog-sync';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ensure an `LmsCourse` exists with curriculum matching `data/carsi_courses.xlsx` (workbook).
 * If the course already exists in the DB, it is returned as-is (no destructive sync).
 */
export async function getOrCreateLmsCourseFromWorkbookCatalog(slug: string): Promise<CourseWithCurriculum> {
  const normalized = slug.trim().toLowerCase();

  const existing = await prisma.lmsCourse.findUnique({
    where: { slug: normalized },
    include: courseWithCurriculum,
  });
  if (existing) return existing;

  const catalog = await loadAdminCatalogFromXlsx();
  const course = catalog.courses.find((c) => c.slug === normalized);
  if (!course) {
    throw new Error('WORKBOOK_COURSE_NOT_FOUND');
  }

  await ensureCatalogInstructor();

  const courseId = randomUUID();
  const statusRaw = (course.status ?? 'draft').toLowerCase();
  const isPublished = statusRaw === 'published';
  const priceAud = new Prisma.Decimal(Number.isFinite(course.priceAud) ? course.priceAud : 0);

  const sortedModules = [...course.modules].sort((a, b) => a.moduleNo - b.moduleNo);

  await prisma.$transaction(async (tx) => {
    await tx.lmsCourse.create({
      data: {
        id: courseId,
        slug: normalized,
        title: course.title,
        description: null,
        shortDescription: null,
        thumbnailUrl: null,
        instructorId: DEFAULT_INSTRUCTOR_ID,
        status: isPublished ? 'published' : 'draft',
        priceAud,
        isFree: course.isFree,
        level: null,
        category: course.categories[0] ?? null,
        iicrcDiscipline: course.iicrcDiscipline,
        isPublished,
      },
    });

    for (let orderIndex = 0; orderIndex < sortedModules.length; orderIndex += 1) {
      const m = sortedModules[orderIndex];
      const moduleId = randomUUID();
      await tx.lmsModule.create({
        data: {
          id: moduleId,
          courseId,
          title: m.title,
          orderIndex,
        },
      });
      const lessonId = randomUUID();
      const lessonTitle = m.lessons[0]?.title ?? m.title;
      await tx.lmsLesson.create({
        data: {
          id: lessonId,
          moduleId,
          title: lessonTitle,
          contentType: 'text',
          contentBody: `<p>${escapeHtml(lessonTitle)}</p>`,
          orderIndex: 0,
          isPreview: orderIndex === 0,
        },
      });
    }
  });

  return prisma.lmsCourse.findUniqueOrThrow({
    where: { id: courseId },
    include: courseWithCurriculum,
  });
}
