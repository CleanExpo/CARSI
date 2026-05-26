import { randomUUID } from 'node:crypto';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';
import { ensureLmsUserFromClaims } from '@/lib/server/lms-user-sync';

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
): Promise<{ lessonsMarked: number }> {
  const en = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId },
    select: { id: true, studentId: true, courseId: true },
  });
  if (!en) throw new Error('ENROLLMENT_NOT_FOUND');

  const { ids, total } = await lessonTotalsForCourse(en.courseId);
  const now = new Date();

  if (total === 0) {
    await syncEnrollmentCompletion(en.id, en.studentId, en.courseId);
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

  await syncEnrollmentCompletion(en.id, en.studentId, en.courseId);
  return { lessonsMarked: total };
}

export async function syncEnrollmentCompletion(
  enrollmentId: string,
  studentId: string,
  courseId: string
): Promise<void> {
  const { ids, total } = await lessonTotalsForCourse(courseId);
  const prior = await prisma.lmsEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { completedAt: true },
  });

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

  const allDone = completed >= total;

  await prisma.lmsEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: allDone ? 'completed' : 'active',
      completedAt: allDone ? (prior?.completedAt ?? new Date()) : null,
    },
  });
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
          durationHours: true,
          level: true,
        },
      },
    },
  });
  if (!row) return null;

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
  await prisma.lmsEnrollment.update({
    where: { id: enrollmentId },
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
    select: { id: true },
  });
  if (!enr) return null;

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
