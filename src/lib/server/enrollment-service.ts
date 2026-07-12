import { randomUUID } from 'node:crypto';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';
import { ensureLmsUserFromClaims } from '@/lib/server/lms-user-sync';
import { isUniqueConstraintError } from '@/lib/server/db-errors';
import { decideEnrollmentCompleted } from '@/lib/server/lms-completion';
import { isEnrolmentAccessAllowed, isRevokedStatus } from '@/lib/server/enrollment-access';

/**
 * Quiz gate for completion (Phase 6, 2026-06-29 audit): a course is only
 * "complete" once every quiz in it has at least one passing attempt by the
 * student. A course with no quizzes is trivially satisfied.
 */
async function allCourseQuizzesPassed(
  courseId: string,
  studentId: string,
): Promise<boolean> {
  const quizIds = (
    await prisma.lmsQuiz.findMany({ where: { courseId }, select: { id: true } })
  ).map((q) => q.id);
  if (quizIds.length === 0) return true;

  const passed = await prisma.lmsQuizAttempt.findMany({
    where: { quizId: { in: quizIds }, studentId, passed: true },
    select: { quizId: true },
    distinct: ['quizId'],
  });
  return passed.length >= quizIds.length;
}

export type EnrollResult =
  | 'already_enrolled'
  | { enrollmentId: string; courseId: string };

export async function enrollStudentInCourse(
  claims: SessionClaims,
  slug: string,
  paymentReference: string
): Promise<EnrollResult> {
  await ensureLmsUserFromClaims(claims);
  const course = await getOrCreateCourseBySlug(slug);

  const existing = await prisma.lmsEnrollment.findUnique({
    where: {
      studentId_courseId: { studentId: claims.sub, courseId: course.id },
    },
  });
  if (existing) return 'already_enrolled';

  try {
    const enrollment = await prisma.lmsEnrollment.create({
      data: {
        id: randomUUID(),
        studentId: claims.sub,
        courseId: course.id,
        status: 'active',
        paymentReference,
      },
    });

    return { enrollmentId: enrollment.id, courseId: course.id };
  } catch (error) {
    // Concurrent enrolment (Stripe webhook + success-page confirm racing) hits
    // the @@unique([studentId, courseId]) constraint. Treat as already enrolled
    // instead of surfacing a 500 to a paying customer.
    if (isUniqueConstraintError(error)) {
      return 'already_enrolled';
    }
    throw error;
  }
}

/** Marks enrolments created for admin-panel users so analytics can exclude them. */
export const ADMIN_ACCESS_PAYMENT_REFERENCE = 'admin:full-access';

/**
 * Admin-panel users get a self-service enrolment on first access so the whole
 * learner stack (curriculum, lesson view, progress, certificates) works for any
 * course without a purchase.
 */
export async function ensureAdminEnrollmentForCourse(
  claims: SessionClaims,
  courseId: string
): Promise<void> {
  await ensureLmsUserFromClaims(claims);
  try {
    await prisma.lmsEnrollment.upsert({
      where: { studentId_courseId: { studentId: claims.sub, courseId } },
      create: {
        id: randomUUID(),
        studentId: claims.sub,
        courseId,
        status: 'active',
        paymentReference: ADMIN_ACCESS_PAYMENT_REFERENCE,
      },
      update: {},
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
}

export async function getCourseIdForLesson(lessonId: string): Promise<string | null> {
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  return lesson?.module.courseId ?? null;
}

async function lessonTotalsForCourse(courseId: string): Promise<{ ids: string[]; total: number }> {
  const course = await prisma.lmsCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { select: { id: true } } },
      },
    },
  });
  const ids = course?.modules.flatMap((m) => m.lessons.map((l) => l.id)) ?? [];
  return { ids, total: ids.length };
}

/** Admin/support: mark every lesson in an enrollment complete and sync enrollment status. */
export async function forceCompleteEnrollment(
  enrollmentId: string,
  studentId: string,
  options?: { initiatedByAdminEmail?: string | null },
): Promise<{ lessonsMarked: number }> {
  const en = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId },
    select: { id: true, studentId: true, courseId: true },
  });
  if (!en) throw new Error('ENROLLMENT_NOT_FOUND');

  const { ids, total } = await lessonTotalsForCourse(en.courseId);
  const now = new Date();

  if (total === 0) {
    await syncEnrollmentCompletion(en.id, en.studentId, en.courseId, {
    ...options,
    bypassQuizGate: true,
  });
    return { lessonsMarked: 0 };
  }

  await prisma.$transaction([
    ...ids.map((lessonId) =>
      prisma.lmsLessonProgress.upsert({
        where: { studentId_lessonId: { studentId: en.studentId, lessonId } },
        create: {
          studentId: en.studentId,
          lessonId,
          completed: true,
          completedAt: now,
          lastAccessedAt: now,
        },
        update: {
          completed: true,
          completedAt: now,
          lastAccessedAt: now,
        },
      }),
    ),
    prisma.lmsEnrollment.update({
      where: { id: en.id },
      data: { lastAccessedLessonId: ids[ids.length - 1]! },
    }),
  ]);

  await syncEnrollmentCompletion(en.id, en.studentId, en.courseId, {
    ...options,
    bypassQuizGate: true,
  });
  return { lessonsMarked: total };
}

export async function syncEnrollmentCompletion(
  enrollmentId: string,
  studentId: string,
  courseId: string,
  options?: {
    initiatedByAdminEmail?: string | null;
    skipIicrcAutoSubmit?: boolean;
    /** Admin force-complete bypasses the quiz gate. */
    bypassQuizGate?: boolean;
  },
): Promise<void> {
  const { ids, total } = await lessonTotalsForCourse(courseId);
  const prior = await prisma.lmsEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { completedAt: true, status: true },
  });

  // STICKY REVOCATION (WS3 / P0-C): a revoked/refunded/disputed enrolment is a
  // terminal state. NEVER resurrect it to active/completed on a later sync —
  // otherwise a refunded learner un-revokes themselves simply by marking a lesson
  // or opening their certificate (completedAt survives revocation, so the
  // wasAlreadyCompleted branch below would flip it straight back). This guard
  // covers BOTH the zero-lesson branch and the main completion write.
  if (isRevokedStatus(prior?.status)) {
    return;
  }

  const wasAlreadyCompleted =
    prior?.status === 'completed' || prior?.completedAt != null;

  if (total === 0) {
    await prisma.lmsEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'active', completedAt: null },
    });
    return;
  }

  const completed = await prisma.lmsLessonProgress.count({
    where: { studentId, lessonId: { in: ids }, completed: true },
  });

  const allLessonsDone = completed >= total;
  const quizGateSatisfied =
    options?.bypassQuizGate === true ||
    (await allCourseQuizzesPassed(courseId, studentId));

  // Certificate/CEC integrity: completion needs lessons AND required quizzes
  // passed, but an already-completed enrollment is never downgraded.
  const isCompleted = decideEnrollmentCompleted({
    allLessonsDone,
    quizGateSatisfied,
    wasAlreadyCompleted,
  });

  // Only fire the (irreversible) IICRC CEC auto-submit on a genuinely new,
  // fully-gated completion — not on a lesson-count-only or downgrade-protected one.
  const newlyGatedCompletion = allLessonsDone && quizGateSatisfied && !wasAlreadyCompleted;

  await prisma.lmsEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: isCompleted ? 'completed' : 'active',
      completedAt: isCompleted ? (prior?.completedAt ?? new Date()) : null,
    },
  });

  if (newlyGatedCompletion && !options?.skipIicrcAutoSubmit) {
    const { processIicrcCecSubmissionForEnrollment } = await import(
      '@/lib/server/iicrc-cec-submission'
    );
    void processIicrcCecSubmissionForEnrollment(enrollmentId, {
      initiatedByAdminEmail: options?.initiatedByAdminEmail ?? null,
    }).catch((e) =>
      console.error('[enrollment] IICRC CEC auto-submit', enrollmentId, e),
    );
  }
}

export async function touchLessonProgress(params: {
  studentId: string;
  lessonId: string;
  enrollmentId: string;
}): Promise<void> {
  const { studentId, lessonId, enrollmentId } = params;
  const now = new Date();

  await prisma.lmsLessonProgress.upsert({
    where: {
      studentId_lessonId: { studentId, lessonId },
    },
    create: {
      studentId,
      lessonId,
      lastAccessedAt: now,
    },
    update: {
      lastAccessedAt: now,
    },
  });

  await prisma.lmsEnrollment.update({
    where: { id: enrollmentId },
    data: { lastAccessedLessonId: lessonId },
  });
}

export async function patchLessonProgress(params: {
  studentId: string;
  lessonId: string;
  enrollmentId: string;
  courseId: string;
  completed: boolean;
}): Promise<void> {
  const { studentId, lessonId, enrollmentId, courseId, completed } = params;
  const now = new Date();

  await prisma.lmsLessonProgress.upsert({
    where: {
      studentId_lessonId: { studentId, lessonId },
    },
    create: {
      studentId,
      lessonId,
      completed,
      completedAt: completed ? now : null,
      lastAccessedAt: now,
    },
    update: {
      completed,
      completedAt: completed ? now : null,
      lastAccessedAt: now,
    },
  });

  await prisma.lmsEnrollment.update({
    where: { id: enrollmentId },
    data: { lastAccessedLessonId: lessonId },
  });

  await syncEnrollmentCompletion(enrollmentId, studentId, courseId);
}

export async function getEnrollmentForCertificate(
  studentSub: string,
  enrollmentId: string
): Promise<{
  id: string;
  student: { email: string; fullName: string | null };
  course: {
    title: string;
    slug: string;
    iicrcDiscipline: string | null;
    cecHours: unknown;
    durationHours: unknown;
    level: string | null;
  };
  completedAt: Date;
  certificateIssuedAt: Date | null;
} | null> {
  const row = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId: studentSub },
    include: {
      student: { select: { email: true, fullName: true } },
      course: {
        select: {
          title: true,
          slug: true,
          id: true,
          iicrcDiscipline: true,
          cecHours: true,
          shortDescription: true,
          description: true,
          meta: true,
          durationHours: true,
          level: true,
        },
      },
    },
  });
  if (!row) return null;

  // No certificate for a revoked/refunded enrolment (WS3 / P0-C). Short-circuit
  // BEFORE syncEnrollmentCompletion — otherwise the sync (were the sticky guard
  // ever bypassed) plus the completed-check below would hand a refunded learner a
  // fresh certificate.
  if (isRevokedStatus(row.status)) return null;

  await syncEnrollmentCompletion(row.id, row.studentId, row.courseId);

  const refreshed = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId: studentSub },
    include: {
      student: { select: { email: true, fullName: true } },
      course: {
        select: {
          title: true,
          slug: true,
          iicrcDiscipline: true,
          cecHours: true,
          shortDescription: true,
          description: true,
          meta: true,
          durationHours: true,
          level: true,
        },
      },
    },
  });
  if (!refreshed || refreshed.status !== 'completed' || !refreshed.completedAt) {
    return null;
  }

  return {
    id: refreshed.id,
    student: refreshed.student,
    course: refreshed.course,
    completedAt: refreshed.completedAt,
    certificateIssuedAt: refreshed.certificateIssuedAt,
  };
}

export async function markCertificateIssued(enrollmentId: string): Promise<void> {
  // Re-assert completion at MINT time (WS3 / P0-C): if a revocation webhook lands
  // between getEnrollmentForCertificate and here, the guarded updateMany is a no-op
  // so a refunded enrolment can never have its certificateIssuedAt (re)stamped.
  await prisma.lmsEnrollment.updateMany({
    where: { id: enrollmentId, status: 'completed' },
    data: { certificateIssuedAt: new Date() },
  });
}

export async function findEnrollmentForCourse(
  studentId: string,
  courseId: string
): Promise<{ id: string } | null> {
  return prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
}

export async function getLessonContextForStudent(
  lessonId: string,
  studentId: string
): Promise<{
  lesson: {
    id: string;
    title: string;
    contentType: string;
    contentBody: string | null;
    orderIndex: number;
    isPreview: boolean;
    resources: unknown;
    module: { courseId: string; course: { id: string; slug: string; title: string } };
  };
  enrollmentId: string;
} | null> {
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });
  if (!lesson) return null;

  const enr = await prisma.lmsEnrollment.findUnique({
    where: {
      studentId_courseId: { studentId, courseId: lesson.module.courseId },
    },
    select: { id: true, status: true },
  });
  // Deny paid lesson content to a revoked/refunded/cancelled enrolment (WS3 / P0-C).
  // Existence alone is not entitlement.
  if (!enr || !isEnrolmentAccessAllowed(enr.status)) return null;

  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType,
      contentBody: lesson.contentBody,
      orderIndex: lesson.orderIndex,
      isPreview: lesson.isPreview,
      resources: lesson.resources,
      module: {
        courseId: lesson.module.courseId,
        course: lesson.module.course,
      },
    },
    enrollmentId: enr.id,
  };
}
