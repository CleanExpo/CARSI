import { randomUUID } from 'node:crypto';

import { getAllSeedSlugs } from '@/lib/lms-seed-catalog';
import { getOrCreateLmsCourseFromWorkbookCatalog } from '@/lib/admin/admin-course-materialize';
import { prisma } from '@/lib/prisma';
import {
  courseWithCurriculum,
  getOrCreateCourseBySlug,
  type CourseWithCurriculum,
} from '@/lib/server/course-catalog-sync';
import type { AdminSessionProvenance } from '@/lib/server/current-admin';
import { forceCompleteEnrollment } from '@/lib/server/enrollment-service';
import { isRevokedStatus } from '@/lib/server/enrollment-access';
import { withLockedEnrollment } from '@/lib/server/enrollment-row-lock';

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
  const unique = [
    ...new Set(params.courseSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ];
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
  //
  // GP-432: lock the enrolment row first (one owner: enrollment-row-lock.ts). An admin
  // force-complete or quiz reset holding the lock finishes before this deletes progress, so
  // its lesson writes cannot survive the revocation.
  await prisma.$transaction((tx) =>
    withLockedEnrollment(tx, { enrollmentId: en.id, require: 'revoke' }, async () => {
      await tx.lmsLessonProgress.deleteMany({
        where: {
          studentId: en.studentId,
          lessonId: { in: lessonIds.map((l) => l.id) },
        },
      });
      await tx.lmsEnrollment.update({
        where: { id: en.id },
        data: { status: 'revoked', certificateIssuedAt: null, completedAt: null },
      });
    }),
  );
}

export type AdminBulkCompleteRow = {
  enrollmentId: string;
  lessonsMarked: number;
  completed: boolean;
};

/**
 * Thrown when a bulk force-complete fails part-way through (GP-769). Rows before the failure are
 * already committed and audited; this error names them, the row that failed and the rows that
 * were never attempted, so the admin screen can say exactly what happened. `cause` is the error
 * the failed row threw (for example NotCurrentAdminError when the admin's access was removed).
 */
export class AdminBulkCompletePartialError extends Error {
  readonly completed: AdminBulkCompleteRow[];
  readonly failed: { enrollmentId: string; error: string };
  readonly notAttempted: string[];
  override readonly cause: unknown;

  constructor(params: {
    completed: AdminBulkCompleteRow[];
    failed: { enrollmentId: string; error: string };
    notAttempted: string[];
    cause?: unknown;
  }) {
    super('BULK_COMPLETE_PARTIAL');
    this.name = 'AdminBulkCompletePartialError';
    this.completed = params.completed;
    this.failed = params.failed;
    this.notAttempted = params.notAttempted;
    this.cause = params.cause;
  }
}

/**
 * Mark every lesson of one or more enrollments complete (GP-432). Each enrolment then completes
 * only if its required assessments are passed; `completed` in each result says which did. A
 * reason is required and each enrolment gets its own audit row (forceCompleteEnrollment).
 *
 * Rows are processed one at a time, in order, and the batch stops at the first failure. It is not
 * one database transaction: each completion can start the IICRC CEC auto-submit, which cannot be
 * rolled back. A part-way failure throws AdminBulkCompletePartialError with a per-row account
 * instead (GP-769).
 */
export async function adminMarkEnrollmentsComplete(params: {
  studentId: string;
  enrollmentIds: string[];
  session: AdminSessionProvenance | null;
  reason: string;
}): Promise<{ updated: number; results: AdminBulkCompleteRow[] }> {
  const student = await prisma.lmsUser.findUnique({ where: { id: params.studentId } });
  if (!student) throw new Error('USER_NOT_FOUND');

  const uniqueIds = [...new Set(params.enrollmentIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error('NO_ENROLLMENTS');

  const owned = await prisma.lmsEnrollment.findMany({
    where: { id: { in: uniqueIds }, studentId: params.studentId },
    select: { id: true, status: true },
  });
  if (owned.length !== uniqueIds.length) {
    throw new Error('ENROLLMENT_NOT_FOUND');
  }
  // Refuse the whole batch before any write when one enrolment is revoked or refunded.
  if (owned.some((row) => isRevokedStatus(row.status))) {
    throw new Error('ENROLLMENT_REVOKED');
  }

  const results: AdminBulkCompleteRow[] = [];
  for (const [index, enrollmentId] of uniqueIds.entries()) {
    try {
      const r = await forceCompleteEnrollment(enrollmentId, params.studentId, {
        session: params.session,
        reason: params.reason,
      });
      results.push({ enrollmentId, lessonsMarked: r.lessonsMarked, completed: r.completed });
    } catch (e) {
      throw new AdminBulkCompletePartialError({
        completed: results,
        failed: { enrollmentId, error: e instanceof Error ? e.message : String(e) },
        notAttempted: uniqueIds.slice(index + 1),
        cause: e,
      });
    }
  }

  return { updated: results.length, results };
}
