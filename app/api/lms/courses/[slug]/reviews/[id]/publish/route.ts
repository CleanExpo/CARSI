import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { NotCurrentAdminError, resolveCurrentAdmin } from '@/lib/server/current-admin';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import {
  canModerateReviews,
  getCourseIdBySlug,
  getReviewForCourse,
  isHideReason,
  REVIEW_HIDE_REASONS,
  setReviewVisibility,
} from '@/lib/server/course-reviews';

/**
 * POST /api/lms/courses/:slug/reviews/:id/publish — hide/unhide a review (admin moderation).
 * Body: { is_published: false, reason } to hide, { is_published: true } to unhide. Admin only;
 * hidden reviews drop out of public listings and never count toward the public average.
 *
 * A hide needs a listed policy reason (spec D2) so the public rating cannot be curated. The
 * reason is validated BEFORE the no-database short-circuit, so a reasonless hide is a 400 in
 * every environment. The actor is the session's user — never anything in the body. Every hide
 * and unhide is recorded as an append-only moderation event (D1). The token's role is only a
 * pre-filter: the admin is re-validated from the database on every request (release-gate r7).
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

  let payload: { is_published?: unknown; reason?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof payload.is_published !== 'boolean') {
    return NextResponse.json({ detail: 'is_published must be a boolean' }, { status: 400 });
  }
  const reason = payload.reason;
  if (payload.is_published === false && !isHideReason(reason)) {
    return NextResponse.json(
      { detail: `To hide a review, choose a reason: ${REVIEW_HIDE_REASONS.join(', ')}` },
      { status: 400 }
    );
  }

  // Never report a hide/unhide that was not stored with its audit event.
  if (!isDatabaseConfigured()) return databaseUnavailableResponse('Review moderation is temporarily unavailable.');

  const forbidden = () => NextResponse.json({ detail: 'Only admins can moderate reviews' }, { status: 403 });
  try {
    if (!(await resolveCurrentAdmin(prisma, claims.email))) return forbidden();
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    const review = await getReviewForCourse(id, course.id);
    if (!review) {
      return NextResponse.json({ detail: 'Review not found' }, { status: 404 });
    }
    if (payload.is_published === false && isHideReason(reason)) {
      await setReviewVisibility({ reviewId: id, isPublished: false, reason, actorId: claims.sub, sessionEmail: claims.email });
      return NextResponse.json({ ok: true, is_published: false, hidden_reason: reason });
    }
    await setReviewVisibility({ reviewId: id, isPublished: true, actorId: claims.sub, sessionEmail: claims.email });
    return NextResponse.json({ ok: true, is_published: true, hidden_reason: null });
  } catch (e) {
    if (e instanceof NotCurrentAdminError) return forbidden();
    console.error('[courses/:slug/reviews/:id/publish POST]', e);
    return NextResponse.json({ detail: 'Failed to update review visibility' }, { status: 500 });
  }
}
