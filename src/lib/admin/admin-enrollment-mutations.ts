import { randomUUID } from 'node:crypto';

import { getAllSeedSlugs, isSeedSlug } from '@/lib/lms-seed-catalog';
import { prisma } from '@/lib/prisma';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';

/**
 * Create an enrollment for a learner for a course in the LMS seed catalog (five pilot courses).
 * Materialises the course in the DB (8 modules + lessons) when missing.
 */
export async function adminGrantEnrollment(params: { studentId: string; courseSlug: string }) {
  const courseSlug = params.courseSlug.trim().toLowerCase();
  if (!isSeedSlug(courseSlug)) {
    throw new Error('COURSE_NOT_IN_WORKBOOK');
  }

  const student = await prisma.lmsUser.findUnique({ where: { id: params.studentId } });
  if (!student) throw new Error('USER_NOT_FOUND');

  const course = await getOrCreateCourseBySlug(courseSlug);

  const existing = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: params.studentId, courseId: course.id } },
  });
  if (existing) return { kind: 'already_enrolled' as const, enrollmentId: existing.id };

  const enrollment = await prisma.lmsEnrollment.create({
    data: {
      id: randomUUID(),
      studentId: params.studentId,
      courseId: course.id,
      status: 'active',
      paymentReference: 'admin:seed-catalog',
    },
  });

  return { kind: 'created' as const, enrollmentId: enrollment.id };
}

/**
 * Remove a learner's enrollment for a seed-catalog course and clear lesson progress for that course.
 */
export async function adminRevokeEnrollment(enrollmentId: string) {
  const en = await prisma.lmsEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      studentId: true,
      courseId: true,
      course: { select: { slug: true } },
    },
  });
  if (!en) throw new Error('ENROLLMENT_NOT_FOUND');

  const allowed = new Set(getAllSeedSlugs());
  if (!allowed.has(en.course.slug)) {
    throw new Error('COURSE_NOT_IN_WORKBOOK');
  }

  const lessonIds = await prisma.lmsLesson.findMany({
    where: { module: { courseId: en.courseId } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.lmsLessonProgress.deleteMany({
      where: {
        studentId: en.studentId,
        lessonId: { in: lessonIds.map((l) => l.id) },
      },
    }),
    prisma.lmsEnrollment.delete({ where: { id: en.id } }),
  ]);
}
