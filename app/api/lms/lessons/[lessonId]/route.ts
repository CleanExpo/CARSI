import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLessonContextForStudent, touchLessonProgress } from '@/lib/server/enrollment-service';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ lessonId: string }> };

function parseResources(raw: unknown): { label?: string; url?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label?: string; url?: string }[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'url' in item) {
      const o = item as { label?: string; url?: string };
      if (typeof o.url === 'string' && o.url) {
        out.push({
          url: o.url,
          label: typeof o.label === 'string' ? o.label : 'Resource',
        });
      }
    }
  }
  return out;
}

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
  const ctxRow = await getLessonContextForStudent(lessonId, claims.sub);
  if (!ctxRow) {
    return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 404 });
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
    resources: parseResources(lesson.resources),
    enrollment_id: ctxRow.enrollmentId,
    course: {
      id: lesson.module.course.id,
      slug: lesson.module.course.slug,
      title: lesson.module.course.title,
    },
  });
}
