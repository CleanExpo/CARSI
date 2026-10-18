import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { resolveCurrentAdmin } from '@/lib/server/current-admin';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import {
  canManageReviews,
  canModerateReviews,
  getCourseIdBySlug,
  getCourseReviews,
  getGoogleReviewLink,
  getOwnReview,
  getReviewAskForStudent,
  getReviewerDisplayName,
  isEnrolledInCourse,
  isValidRating,
  upsertReview,
} from '@/lib/server/course-reviews';

/**
 * GET /api/lms/courses/:slug/reviews — public: published reviews + aggregate summary.
 * When called with a session, also returns the caller's own review + whether they may review.
 *
 * Review ask (spec D5/D7): `review_ask` is true for a completer who has not reviewed yet, derived
 * from database state on every call. `google_review_url` is the validated Google review link or
 * null — the same value for every caller, never dependent on any rating.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const googleReviewUrl = getGoogleReviewLink().url;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      reviews: [],
      summary: { average: 0, count: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
      can_review: false,
      can_manage: false,
      can_moderate: false,
      own_review: null,
      review_ask: false,
      reviewer_display_name: null,
      google_review_url: googleReviewUrl,
    });
  }

  try {
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }

    // Optional auth: enrich with the caller's own-review + moderation state when signed in.
    const claims = await getSessionClaimsFromRequest(request);
    let canReview = false;
    let canManage = false;
    let canModerate = false;
    let ownReview = null;
    let reviewAsk = false;
    let reviewerDisplayName: string | null = null;
    if (claims) {
      canManage = canManageReviews(claims.role);
      // Hidden reviews and their reasons go only to a CURRENT admin, re-checked in the database (r7).
      canModerate = canModerateReviews(claims.role) && (await resolveCurrentAdmin(prisma, claims.email)) !== null;
      canReview = await isEnrolledInCourse(claims.sub, course.id);
      ownReview = canReview ? await getOwnReview(claims.sub, course.id) : null;
      if (canReview) {
        [reviewAsk, reviewerDisplayName] = await Promise.all([
          getReviewAskForStudent(claims.sub, course),
          getReviewerDisplayName(claims.sub),
        ]);
      }
    }

    // Moderators also see admin-hidden reviews (so they can unhide them).
    const { reviews, summary } = await getCourseReviews(course.id, canModerate);

    return NextResponse.json({
      reviews,
      summary,
      can_review: canReview,
      can_manage: canManage,
      can_moderate: canModerate,
      own_review: ownReview,
      review_ask: reviewAsk,
      reviewer_display_name: reviewerDisplayName,
      google_review_url: googleReviewUrl,
    });
  } catch (e) {
    console.error('[courses/:slug/reviews GET]', e);
    return NextResponse.json({ detail: 'Failed to load reviews' }, { status: 500 });
  }
}

/**
 * POST /api/lms/courses/:slug/reviews — create/update the caller's review.
 * Requires a session AND an enrolment in the course. Body: { rating: 1-5, title?, body? }.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await ctx.params;

  let payload: { rating?: unknown; title?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isValidRating(payload.rating)) {
    return NextResponse.json({ detail: 'rating must be an integer from 1 to 5' }, { status: 400 });
  }
  const title = typeof payload.title === 'string' ? payload.title : null;
  const body = typeof payload.body === 'string' ? payload.body : null;

  // A learner must never be told their review was saved when it was not.
  if (!isDatabaseConfigured()) return databaseUnavailableResponse('Reviews are temporarily unavailable. Please try again.');

  try {
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    if (!(await isEnrolledInCourse(claims.sub, course.id))) {
      return NextResponse.json(
        { detail: 'You can only review a course you are enrolled in' },
        { status: 403 }
      );
    }
    await upsertReview({ courseId: course.id, studentId: claims.sub, rating: payload.rating, title, body });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('[courses/:slug/reviews POST]', e);
    return NextResponse.json({ detail: 'Failed to save review' }, { status: 500 });
  }
}
