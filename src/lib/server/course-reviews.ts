/**
 * Course reviews / star ratings (GP-117).
 *
 * Students who are enrolled in a course can leave a single 1–5 star review (upsert).
 * Public course pages show the aggregate (average + count + star distribution) and the
 * published reviews. The pure `summarizeReviews` / `toReviewDto` mappers are DB-free so
 * they can be unit-tested, matching the repo convention (see `notifications.ts`).
 */

import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import {
  ANONYMOUS_REVIEWER_LABEL,
  isReviewAskEligible,
  resolveGoogleReviewUrl,
  shouldShowReviewAsk,
  type GoogleReviewUrlStatus,
  type ReviewHideReason,
} from '@/lib/reviews/review-ask';
import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';

export { REVIEW_HIDE_REASONS, isHideReason, type ReviewHideReason } from '@/lib/reviews/review-ask';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reply: string | null;
  repliedAt: Date | null;
  isPublished: boolean;
  createdAt: Date;
  /** `email` is never used for display (D8); it is optional so callers need not select it. */
  student: { fullName: string | null; email?: string } | null;
};

export type ReviewDto = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  /** Public instructor/admin response, if any (GP-118). */
  reply: string | null;
  replied_at: string | null;
  /** Whether the review is publicly visible (false = admin-hidden). */
  is_published: boolean;
  author: string;
  created_at: string;
};

/**
 * Moderator-only view of a review's moderation state (D2/D3/D4). Never part of the public
 * DTO: the public GET only ever receives `ReviewDto`.
 */
export type ReviewModerationDto = {
  /** Reason of the latest hide; null when visible, or when hidden before reasons were recorded. */
  hidden_reason: ReviewHideReason | null;
  hidden_at: string | null;
  /** Hidden before the moderation audit existed — no reason was ever recorded (D3). */
  hidden_before_reasons_recorded: boolean;
  /** The learner changed the title/body after the latest hide (D4). */
  edited_after_hide: boolean;
};

export type ModeratorReviewDto = ReviewDto & { moderation: ReviewModerationDto };

/** Roles allowed to publish a response to a review (mirrors WORKFLOW_ROLES). */
export function canManageReviews(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'instructor';
}

/** Only admins may hide/unhide (moderate) a review — instructors would have a conflict of interest. */
export function canModerateReviews(role: string | null | undefined): boolean {
  return role === 'admin';
}

export type ReviewSummary = {
  average: number;
  count: number;
  /** Number of reviews at each star level, keyed "1".."5". */
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

/** A rating is valid iff it's an integer in [MIN_RATING, MAX_RATING]. */
export function isValidRating(rating: unknown): rating is number {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * First name only — never leak a reviewer's identity publicly (D8). With no name on file the
 * label is a fixed neutral one; it is never derived from the email (an address local-part such
 * as `john.smith.waterdamage` is personal information the learner never agreed to publish).
 */
export function displayAuthor(student: { fullName: string | null } | null): string {
  const name = student?.fullName?.trim();
  if (name) return name.split(/\s+/)[0]!;
  return ANONYMOUS_REVIEWER_LABEL;
}

/** Pure: map a persisted review row to the public DTO. */
export function toReviewDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    reply: row.reply,
    replied_at: row.repliedAt ? row.repliedAt.toISOString() : null,
    is_published: row.isPublished,
    author: displayAuthor(row.student),
    created_at: row.createdAt.toISOString(),
  };
}

/** Pure: aggregate a set of ratings into average (1dp) + count + per-star distribution. */
export function summarizeReviews(ratings: Array<{ rating: number }>): ReviewSummary {
  const distribution: ReviewSummary['distribution'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let total = 0;
  let count = 0;
  for (const { rating } of ratings) {
    if (!isValidRating(rating)) continue;
    distribution[String(rating) as keyof ReviewSummary['distribution']] += 1;
    total += rating;
    count += 1;
  }
  const average = count === 0 ? 0 : Math.round((total / count) * 10) / 10;
  return { average, count, distribution };
}

/** Resolve a course id (+ title) from its public slug. */
export async function getCourseIdBySlug(
  slug: string
): Promise<{ id: string; title: string; slug: string; category: string | null; meta: unknown } | null> {
  return prisma.lmsCourse.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: { id: true, title: true, slug: true, category: true, meta: true },
  });
}

/**
 * True only if the student holds an access-granting enrolment (active or completed) — the gate
 * to review it (D6). A refunded, revoked or disputed enrolment cannot post a review.
 */
export async function isEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  const enrolment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { status: true },
  });
  return enrolment !== null && isEnrolmentAccessAllowed(enrolment.status);
}

/**
 * Whether this learner should see the review ask for this course right now (D5): derived from
 * database state on every load — never from URL flags, client lesson progress or a dismissal.
 */
export async function getReviewAskForStudent(
  studentId: string,
  course: { id: string; slug: string; category: string | null; meta?: unknown }
): Promise<boolean> {
  const [enrolment, review] = await Promise.all([
    prisma.lmsEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: course.id } },
      select: { status: true, completedAt: true },
    }),
    prisma.lmsCourseReview.findUnique({
      where: { courseId_studentId: { courseId: course.id, studentId } },
      select: { id: true },
    }),
  ]);
  if (!enrolment) return false;
  const eligible = isReviewAskEligible({
    status: enrolment.status,
    completedAt: enrolment.completedAt,
    isOnboardingCourse: isOnboardingCourse({ slug: course.slug, category: course.category, meta: course.meta }),
  });
  return shouldShowReviewAsk({ eligible, hasOwnReview: review !== null });
}

/** Course slug for an enrolment (credential id), used to place the review ask on the credential page. */
export async function getCourseSlugForEnrollment(enrollmentId: string): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim() || !enrollmentId?.trim()) return null;
  try {
    const row = await prisma.lmsEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { course: { select: { slug: true } } },
    });
    return row?.course.slug ?? null;
  } catch {
    // Not a valid enrolment id (e.g. a non-uuid credential id): no ask, page still renders.
    return null;
  }
}

/** Public name preview for the review form ("Your review will appear as …"). */
export async function getReviewerDisplayName(studentId: string): Promise<string> {
  const user = await prisma.lmsUser.findUnique({
    where: { id: studentId },
    select: { fullName: true },
  });
  return displayAuthor(user);
}

let warnedRejectedGoogleUrl = false;

/**
 * GOOGLE_REVIEW_URL, validated (D7, D13). A rejected value logs one warning per process so a
 * misconfiguration is visible rather than silently hiding the link from every reviewer.
 */
export function getGoogleReviewLink(): { url: string | null; status: GoogleReviewUrlStatus } {
  const resolved = resolveGoogleReviewUrl(process.env.GOOGLE_REVIEW_URL);
  if (resolved.status === 'rejected' && !warnedRejectedGoogleUrl) {
    warnedRejectedGoogleUrl = true;
    console.warn(
      '[course-reviews] GOOGLE_REVIEW_URL rejected: it must be https://g.page/r/<id> or ' +
        'https://search.google.com/local/writereview?placeid=<id>; the Google link is hidden'
    );
  }
  return resolved;
}

/**
 * Reviews for a course, newest first, plus the aggregate summary.
 * `includeHidden` (moderators only) also returns admin-hidden reviews; the public
 * summary is always computed from published reviews only, so hidden ones never skew it.
 */
export async function getCourseReviews(
  courseId: string,
  includeHidden = false
): Promise<{ reviews: Array<ReviewDto | ModeratorReviewDto>; summary: ReviewSummary }> {
  const rows = await prisma.lmsCourseReview.findMany({
    where: includeHidden ? { courseId } : { courseId, isPublished: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      reply: true,
      repliedAt: true,
      isPublished: true,
      createdAt: true,
      student: { select: { fullName: true } },
      ...(includeHidden
        ? {
            moderationEvents: {
              orderBy: { createdAt: 'desc' as const },
              take: 1,
              select: { action: true, reason: true, contentSha256: true, ratingAtAction: true, createdAt: true },
            },
          }
        : {}),
    },
  });
  const summary = summarizeReviews(rows.filter((r) => r.isPublished));
  if (!includeHidden) return { reviews: rows.map(toReviewDto), summary };
  return {
    reviews: rows.map((row) => ({
      ...toReviewDto(row),
      moderation: toModerationDto(row, (row as { moderationEvents?: LatestModerationEvent[] }).moderationEvents?.[0] ?? null),
    })),
    summary,
  };
}

type LatestModerationEvent = {
  action: string;
  reason: string | null;
  contentSha256: string;
  ratingAtAction: number;
  createdAt: Date;
};

/** sha256 of the reviewed text, so an edit after a hide is detectable (D4). */
export function reviewContentSha256(title: string | null, body: string | null): string {
  return createHash('sha256').update(`${title ?? ''}\n${body ?? ''}`).digest('hex');
}

/** Pure: moderator view of the latest moderation decision for a review (D2/D3/D4). */
export function toModerationDto(
  row: { isPublished: boolean; rating: number; title: string | null; body: string | null },
  latest: LatestModerationEvent | null
): ReviewModerationDto {
  if (row.isPublished) {
    return { hidden_reason: null, hidden_at: null, hidden_before_reasons_recorded: false, edited_after_hide: false };
  }
  if (!latest || latest.action !== 'hide') {
    return { hidden_reason: null, hidden_at: null, hidden_before_reasons_recorded: true, edited_after_hide: false };
  }
  return {
    hidden_reason: latest.reason as ReviewHideReason,
    hidden_at: latest.createdAt.toISOString(),
    hidden_before_reasons_recorded: false,
    edited_after_hide:
      latest.contentSha256 !== reviewContentSha256(row.title, row.body) || latest.ratingAtAction !== row.rating,
  };
}

/**
 * Hide or unhide a review (admin moderation), recording the decision as an append-only
 * moderation event in the SAME transaction as the flag flip (D1). A hide requires a reason —
 * enforced by the route, by this signature, and by a database CHECK.
 */
export async function setReviewVisibility(
  params:
    | { reviewId: string; isPublished: false; reason: ReviewHideReason; actorId: string }
    | { reviewId: string; isPublished: true; reason?: undefined; actorId: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const review = await tx.lmsCourseReview.update({
      where: { id: params.reviewId },
      data: { isPublished: params.isPublished },
      select: { rating: true, title: true, body: true },
    });
    await tx.lmsCourseReviewModerationEvent.create({
      data: {
        reviewId: params.reviewId,
        action: params.isPublished ? 'unhide' : 'hide',
        reason: params.isPublished ? null : params.reason,
        actorId: params.actorId,
        ratingAtAction: review.rating,
        contentSha256: reviewContentSha256(review.title, review.body),
      },
    });
  });
}

/** Minimal review lookup for reply validation (confirms it belongs to the course). */
export async function getReviewForCourse(
  reviewId: string,
  courseId: string
): Promise<{ id: string; rating: number; title: string | null; body: string | null } | null> {
  return prisma.lmsCourseReview.findFirst({
    where: { id: reviewId, courseId },
    select: { id: true, rating: true, title: true, body: true },
  });
}

/** Publish (or clear) an instructor/admin response to a review. */
export async function setReviewReply(params: {
  reviewId: string;
  reply: string | null;
  repliedById: string;
}): Promise<void> {
  const reply = params.reply?.trim() || null;
  await prisma.lmsCourseReview.update({
    where: { id: params.reviewId },
    data: {
      reply,
      repliedAt: reply ? new Date() : null,
      repliedById: reply ? params.repliedById : null,
    },
  });
}

/**
 * Lightweight aggregate for SEO (`AggregateRating` JSON-LD) — average + count only,
 * no row fetch. Returns null when there are no published reviews (omit the schema then;
 * Google flags an AggregateRating with reviewCount 0).
 */
export async function getAggregateRating(
  courseId: string
): Promise<{ ratingValue: number; reviewCount: number } | null> {
  const agg = await prisma.lmsCourseReview.aggregate({
    where: { courseId, isPublished: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = agg._count._all;
  if (reviewCount === 0) return null;
  return { ratingValue: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount };
}

/** The current student's own review for a course, if any. */
export async function getOwnReview(
  studentId: string,
  courseId: string
): Promise<{ rating: number; title: string | null; body: string | null } | null> {
  return prisma.lmsCourseReview.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { rating: true, title: true, body: true },
  });
}

/** Create or update the student's review. Assumes the enrolment gate was already checked. */
export async function upsertReview(params: {
  courseId: string;
  studentId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}): Promise<void> {
  const title = params.title?.trim() || null;
  const body = params.body?.trim() || null;
  await prisma.lmsCourseReview.upsert({
    where: { courseId_studentId: { courseId: params.courseId, studentId: params.studentId } },
    create: {
      courseId: params.courseId,
      studentId: params.studentId,
      rating: params.rating,
      title,
      body,
    },
    update: { rating: params.rating, title, body },
  });
}
