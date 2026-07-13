import { NextRequest, NextResponse } from 'next/server';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { parseOnboardingMeta, isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { ensureAdminEnrollmentForCourse } from '@/lib/server/enrollment-service';
import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';
import { prisma } from '@/lib/prisma';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const { slug } = await ctx.params;
    const url = `${upstream.replace(/\/$/, '')}/api/lms/courses/${encodeURIComponent(slug)}/curriculum`;
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

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim().toLowerCase();

  const course = await prisma.lmsCourse.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
  }

  let enrollment = await prisma.lmsEnrollment.findUnique({
    where: {
      studentId_courseId: { studentId: claims.sub, courseId: course.id },
    },
  });

  if (!enrollment && isLmsClaimsAllowedAdminPanel(claims)) {
    await ensureAdminEnrollmentForCourse(claims, course.id);
    enrollment = await prisma.lmsEnrollment.findUnique({
      where: {
        studentId_courseId: { studentId: claims.sub, courseId: course.id },
      },
    });
  }

  // Allow-set (WS3 / P0-C): a revoked/refunded enrolment must not receive the
  // curriculum map (from which every lesson-content GET can be driven).
  if (!enrollment || !isEnrolmentAccessAllowed(enrollment.status)) {
    return NextResponse.json({ detail: 'Not enrolled in this course' }, { status: 403 });
  }

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRows =
    lessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { studentId: claims.sub, lessonId: { in: lessonIds } },
        });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      thumbnail_url: course.thumbnailUrl,
      category: course.category,
      is_onboarding: isOnboardingCourse({
        slug: course.slug,
        category: course.category,
        meta: course.meta,
      }),
      meta: parseOnboardingMeta(course.meta),
    },
    enrollment_id: enrollment.id,
    modules: course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order_index: mod.orderIndex,
      lessons: mod.lessons.map((les) => {
        const p = progressByLesson.get(les.id);
        return {
          id: les.id,
          title: les.title,
          order_index: les.orderIndex,
          content_type: les.contentType,
          is_preview: les.isPreview,
          completed: p?.completed === true,
        };
      }),
    })),
  });
}
