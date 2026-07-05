import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { deleteNote, upsertNote } from '@/lib/server/lesson-notes';

type Ctx = { params: Promise<{ lessonId: string }> };

/** PUT /api/lms/notes/:lessonId — upsert the current user's note for a lesson (GP-459). */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { lessonId } = await ctx.params;
  if (!lessonId) {
    return NextResponse.json({ detail: 'Missing lesson id' }, { status: 400 });
  }

  let content = '';
  let courseSlug: string | undefined;
  let courseTitle: string | undefined;
  let lessonTitle: string | undefined;
  let moduleTitle: string | undefined;
  try {
    const body = (await request.json()) as
      | {
          content?: unknown;
          course_slug?: unknown;
          course_title?: unknown;
          lesson_title?: unknown;
          module_title?: unknown;
        }
      | undefined;
    content = typeof body?.content === 'string' ? body.content : '';
    courseSlug = typeof body?.course_slug === 'string' ? body.course_slug : undefined;
    courseTitle = typeof body?.course_title === 'string' ? body.course_title : undefined;
    lessonTitle = typeof body?.lesson_title === 'string' ? body.lesson_title : undefined;
    moduleTitle = typeof body?.module_title === 'string' ? body.module_title : undefined;
  } catch {
    content = '';
  }

  try {
    const note = await upsertNote(claims.sub, lessonId, content, {
      courseSlug,
      courseTitle,
      lessonTitle,
      moduleTitle,
    });
    return NextResponse.json(note);
  } catch (e) {
    console.error('[notes/:lessonId PUT]', e);
    return NextResponse.json({ detail: 'Failed to save note' }, { status: 500 });
  }
}

/** DELETE /api/lms/notes/:lessonId — delete the current user's note for a lesson (GP-459). */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { lessonId } = await ctx.params;
  if (!lessonId) {
    return NextResponse.json({ detail: 'Missing lesson id' }, { status: 400 });
  }

  try {
    await deleteNote(claims.sub, lessonId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[notes/:lessonId DELETE]', e);
    return NextResponse.json({ detail: 'Failed to delete note' }, { status: 500 });
  }
}
