import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import {
  adminGetCourse,
  adminTransitionCourseWorkflow,
  courseToAdminDto,
} from '@/lib/admin/admin-courses-service';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/courses/[id]/workflow — draft → in_review → published (Phase 3). */
export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'save_draft' && action !== 'submit_review' && action !== 'publish') {
    return NextResponse.json({ detail: 'Invalid workflow action' }, { status: 400 });
  }

  const existing = await adminGetCourse(id);
  if (!existing) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  try {
    await adminTransitionCourseWorkflow(id, action);
    const course = await adminGetCourse(id);
    if (!course) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    // Bust the ISR cache for the public catalogue pages (issue #129) so a
    // publish/unpublish is reflected immediately rather than after the 5-min window.
    revalidatePath('/');
    revalidatePath('/courses');
    if (course.slug) revalidatePath(`/courses/${course.slug}`);
    revalidatePath('/sitemap.xml');
    return NextResponse.json({ course: courseToAdminDto(course) });
  } catch (e) {
    console.error('[admin/courses/workflow]', e);
    return NextResponse.json({ detail: 'Workflow update failed' }, { status: 500 });
  }
}
