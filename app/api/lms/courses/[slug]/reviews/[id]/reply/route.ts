import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  canManageReviews,
  getCourseIdBySlug,
  getReviewForCourse,
  setReviewReply,
} from '@/lib/server/course-reviews';

/**
 * POST /api/lms/courses/:slug/reviews/:id/reply — publish (or clear) an instructor/admin
 * response to a review (GP-118). Body: { reply: string | null }. Clearing = empty/null reply.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!canManageReviews(claims.role)) {
    return NextResponse.json({ detail: 'Only instructors or admins can reply' }, { status: 403 });
  }

  const { slug, id } = await ctx.params;

  let payload: { reply?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (payload.reply != null && typeof payload.reply !== 'string') {
    return NextResponse.json({ detail: 'reply must be a string or null' }, { status: 400 });
  }
  const reply = (payload.reply as string | null) ?? null;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    const review = await getReviewForCourse(id, course.id);
    if (!review) {
      return NextResponse.json({ detail: 'Review not found' }, { status: 404 });
    }
    await setReviewReply({ reviewId: id, reply, repliedById: claims.sub });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[courses/:slug/reviews/:id/reply POST]', e);
    return NextResponse.json({ detail: 'Failed to save reply' }, { status: 500 });
  }
}
