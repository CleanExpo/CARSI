import { NextRequest, NextResponse } from 'next/server';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { findEnrolledCoursePrerequisiteBlock, prerequisiteBlockBody } from '@/lib/server/course-prerequisites';
import {
  ensureStaffEnrollmentForLesson,
  getLessonContextForStudent,
  touchLessonProgress,
} from '@/lib/server/enrollment-service';
import { mergeLessonInteractivePilots } from '@/lib/lms/append-interactive-pilot';
import { parseLessonResources } from '@/lib/lms/lesson-resources';
import { readLessonInteractiveProgress } from '@/lib/server/lesson-interactive-progress';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ lessonId: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const { lessonId } = await ctx.params;
    const url = `${upstream.replace(/\/$/, '')}/api/lms/lessons/${encodeURIComponent(lessonId)}`;
    const res = await fetch(url, {
      headers: {
        authorization: request.headers.get('authorization') ?? '',
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { lessonId } = await ctx.params;

  // Staff access: admins (any course), instructors (allow-listed workshop courses only).
  await ensureStaffEnrollmentForLesson(claims, lessonId);

  const ctxRow = await getLessonContextForStudent(lessonId, claims.sub);
  if (!ctxRow) {
    return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 404 });
  }

  // Prerequisite gate (DECISIONS #41) — grandfathered enrolments pass; see course-prerequisites.
  const prereqBlock = await findEnrolledCoursePrerequisiteBlock({
    userId: claims.sub,
    isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
    courseId: ctxRow.lesson.module.courseId,
  });
  if (prereqBlock) {
    return NextResponse.json(prerequisiteBlockBody(prereqBlock), { status: 403 });
  }

  await touchLessonProgress({
    studentId: claims.sub,
    lessonId: ctxRow.lesson.id,
    enrollmentId: ctxRow.enrollmentId,
  });

  const { lesson } = ctxRow;
  const drive =
    lesson.contentType === 'drive_file' && lesson.contentBody
      ? lesson.contentBody.trim()
      : null;

  const courseSlug = lesson.module.course.slug;
  const resources = mergeLessonInteractivePilots(
    courseSlug,
    lesson.id,
    parseLessonResources(lesson.resources)
  );

  const interactiveProgress = await readLessonInteractiveProgress(prisma, claims.sub, lesson.id);

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      content_type: lesson.contentType,
      content_body: lesson.contentBody,
      drive_file_id: drive,
      duration_minutes: null,
      is_preview: lesson.isPreview,
      order_index: lesson.orderIndex,
      course_id: lesson.module.courseId,
    },
    resources,
    interactive_progress: interactiveProgress,
    enrollment_id: ctxRow.enrollmentId,
    course: {
      id: lesson.module.course.id,
      slug: lesson.module.course.slug,
      title: lesson.module.course.title,
    },
  });
}
