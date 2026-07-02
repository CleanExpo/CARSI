import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { canManageReviews, getCourseIdBySlug, getReviewForCourse } from '@/lib/server/course-reviews';
import { draftReviewReply } from '@/lib/server/review-reply-draft';

/**
 * POST /api/lms/courses/:slug/reviews/:id/reply/draft — AI-suggest an instructor reply
 * (GP-118). Instructor/admin only. Returns { draft: string | null }; null when the model
 * is unconfigured or errors, so the UI falls back to writing manually.
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
    return NextResponse.json({ detail: 'Only instructors or admins can draft replies' }, { status: 403 });
  }

  const { slug, id } = await ctx.params;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ draft: null });
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
    const draft = await draftReviewReply({
      courseTitle: course.title,
      rating: review.rating,
      title: review.title,
      body: review.body,
    });
    return NextResponse.json({ draft });
  } catch (e) {
    console.error('[courses/:slug/reviews/:id/reply/draft POST]', e);
    return NextResponse.json({ detail: 'Failed to draft reply' }, { status: 500 });
  }
}
