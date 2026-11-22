import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import {
  adminGetCourse,
  adminTransitionCourseWorkflow,
  courseToAdminDto,
} from '@/lib/admin/admin-courses-service';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { CoursePublishBlockedError } from '@/lib/admin/course-publish-gate';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/courses/[id]/workflow — draft → in_review → approve → published (GP-776).
 * `approve` records the signed-in admin as the approver of the current content. `publish` runs
 * the publish gate; when it is blocked the response is 409 with the plain-text blockers.
 */
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
  if (
    action !== 'save_draft' &&
    action !== 'submit_review' &&
    action !== 'approve' &&
    action !== 'publish'
  ) {
    return NextResponse.json({ detail: 'Invalid workflow action' }, { status: 400 });
  }

  const existing = await adminGetCourse(id);
  if (!existing) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  try {
    await adminTransitionCourseWorkflow(id, action, session.email ?? '');
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
    if (e instanceof CoursePublishBlockedError) {
      return NextResponse.json(
        {
          detail:
            action === 'approve' ? 'The course cannot be approved yet' : 'The course cannot be published yet',
          blockers: e.blockers,
        },
        { status: 409 }
      );
    }
    if (e instanceof Error && e.message === 'ACTOR_REQUIRED') {
      return NextResponse.json({ detail: 'Sign in with a named admin account to approve or publish' }, { status: 403 });
    }
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    console.error('[admin/courses/workflow]', e);
    return NextResponse.json({ detail: 'Workflow update failed' }, { status: 500 });
  }
}
