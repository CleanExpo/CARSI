import { randomUUID } from 'node:crypto';

import { getAllSeedSlugs } from '@/lib/lms-seed-catalog';
import { getOrCreateLmsCourseFromWorkbookCatalog } from '@/lib/admin/admin-course-materialize';
import { prisma } from '@/lib/prisma';
import {
  courseWithCurriculum,
  getOrCreateCourseBySlug,
  type CourseWithCurriculum,
} from '@/lib/server/course-catalog-sync';
import { forceCompleteEnrollment } from '@/lib/server/enrollment-service';

function isWorkbookInfrastructureError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('enoent') ||
    m.includes('python') ||
    m.includes('spawn') ||
    m.includes('expected sheets not found') ||
    m.includes('carsi_courses.xlsx')
  );
}

async function resolveCourseForAdminGrant(slug: string): Promise<CourseWithCurriculum> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) throw new Error('INVALID_COURSE_SLUG');

  const existing = await prisma.lmsCourse.findUnique({
    where: { slug: normalized },
    include: courseWithCurriculum,
  });
  if (existing) return existing;

  try {
    return await getOrCreateLmsCourseFromWorkbookCatalog(normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'WORKBOOK_COURSE_NOT_FOUND' || isWorkbookInfrastructureError(msg)) {
      return getOrCreateCourseBySlug(normalized);
    }
    throw e;
  }
}

/**
 * Create an enrollment for a learner for a course in the LMS seed catalog (five pilot courses).
 * Materialises the course in the DB (8 modules + lessons) when missing.
 */
export async function adminGrantEnrollment(params: {
  studentId: string;
  courseSlug: string;
  paymentReference?: string;
}) {
  const courseSlug = params.courseSlug.trim().toLowerCase();
  if (!courseSlug) throw new Error('INVALID_COURSE_SLUG');

  const student = await prisma.lmsUser.findUnique({ where: { id: params.studentId } });
  if (!student) throw new Error('USER_NOT_FOUND');

  const course = await resolveCourseForAdminGrant(courseSlug);

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
      paymentReference: params.paymentReference ?? 'admin:seed-catalog',
    },
  });

  return { kind: 'created' as const, enrollmentId: enrollment.id };
}

export async function adminGrantEnrollments(params: {
  studentId: string;
  courseSlugs: string[];
  paymentReference?: string;
}): Promise<{
  created: number;
  alreadyEnrolled: number;
  enrollmentIds: string[];
}> {
  const unique = [...new Set(params.courseSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) throw new Error('NO_COURSES');

  let created = 0;
  let alreadyEnrolled = 0;
  const enrollmentIds: string[] = [];

  for (const courseSlug of unique) {
    const result = await adminGrantEnrollment({
      studentId: params.studentId,
      courseSlug,
      paymentReference: params.paymentReference,
    });
    enrollmentIds.push(result.enrollmentId);
    if (result.kind === 'already_enrolled') alreadyEnrolled += 1;
    else created += 1;
  }

  return { created, alreadyEnrolled, enrollmentIds };
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

  // WS6: soft-revoke instead of hard-delete. A hard delete would erase any filed
  // IICRC CEC compliance record (now FK-RESTRICT-protected — the delete would
  // P2003) along with the enrolment's own history. Setting status='revoked'
  // removes access via the WS3 read gates while preserving the audit trail and
  // the regulatory record.
  await prisma.$transaction([
    prisma.lmsLessonProgress.deleteMany({
      where: {
        studentId: en.studentId,
        lessonId: { in: lessonIds.map((l) => l.id) },
      },
    }),
    prisma.lmsEnrollment.update({
      where: { id: en.id },
      data: { status: 'revoked', certificateIssuedAt: null, completedAt: null },
    }),
  ]);
}

/** Mark one or more enrollments fully complete (all lessons + enrollment status). */
export async function adminMarkEnrollmentsComplete(params: {
  studentId: string;
  enrollmentIds: string[];
  initiatedByAdminEmail?: string | null;
}): Promise<{ updated: number; results: { enrollmentId: string; lessonsMarked: number }[] }> {
  const student = await prisma.lmsUser.findUnique({ where: { id: params.studentId } });
  if (!student) throw new Error('USER_NOT_FOUND');

  const uniqueIds = [...new Set(params.enrollmentIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error('NO_ENROLLMENTS');

  const owned = await prisma.lmsEnrollment.findMany({
    where: { id: { in: uniqueIds }, studentId: params.studentId },
    select: { id: true },
  });
  if (owned.length !== uniqueIds.length) {
    throw new Error('ENROLLMENT_NOT_FOUND');
  }

  const results: { enrollmentId: string; lessonsMarked: number }[] = [];
  for (const enrollmentId of uniqueIds) {
    const r = await forceCompleteEnrollment(enrollmentId, params.studentId, {
      initiatedByAdminEmail: params.initiatedByAdminEmail,
    });
    results.push({ enrollmentId, lessonsMarked: r.lessonsMarked });
  }

  return { updated: results.length, results };
}
