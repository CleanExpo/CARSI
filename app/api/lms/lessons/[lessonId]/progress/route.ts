import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLessonContextForStudent, patchLessonProgress } from '@/lib/server/enrollment-service';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ lessonId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const { lessonId } = await ctx.params;
    const url = `${upstream.replace(/\/$/, '')}/api/lms/lessons/${encodeURIComponent(lessonId)}/progress`;
    const body = await request.text();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: request.headers.get('authorization') ?? '',
        cookie: request.headers.get('cookie') ?? '',
      },
      body: body || undefined,
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

  const json = (await request.json().catch(() => ({}))) as { completed?: boolean };
  if (typeof json.completed !== 'boolean') {
    return NextResponse.json({ detail: 'completed boolean required' }, { status: 400 });
  }

  const { lessonId } = await ctx.params;
  const ctxRow = await getLessonContextForStudent(lessonId, claims.sub);
  if (!ctxRow) {
    return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 404 });
  }

  await patchLessonProgress({
    studentId: claims.sub,
    lessonId: ctxRow.lesson.id,
    enrollmentId: ctxRow.enrollmentId,
    courseId: ctxRow.lesson.module.courseId,
    completed: json.completed,
  });

  return NextResponse.json({ ok: true });
}
