import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  canModerateReviews,
  getCourseIdBySlug,
  getReviewForCourse,
  setReviewPublished,
} from '@/lib/server/course-reviews';

/**
 * POST /api/lms/courses/:slug/reviews/:id/publish — hide/unhide a review (admin moderation).
 * Body: { is_published: boolean }. Admin only; hidden reviews drop out of public listings
 * and never count toward the public average.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!canModerateReviews(claims.role)) {
    return NextResponse.json({ detail: 'Only admins can moderate reviews' }, { status: 403 });
  }

  const { slug, id } = await ctx.params;

  let payload: { is_published?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof payload.is_published !== 'boolean') {
    return NextResponse.json({ detail: 'is_published must be a boolean' }, { status: 400 });
  }

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
    await setReviewPublished(id, payload.is_published);
    return NextResponse.json({ ok: true, is_published: payload.is_published });
  } catch (e) {
    console.error('[courses/:slug/reviews/:id/publish POST]', e);
    return NextResponse.json({ detail: 'Failed to update review visibility' }, { status: 500 });
  }
}
