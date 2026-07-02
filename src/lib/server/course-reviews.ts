/**
 * Course reviews / star ratings (GP-117).
 *
 * Students who are enrolled in a course can leave a single 1–5 star review (upsert).
 * Public course pages show the aggregate (average + count + star distribution) and the
 * published reviews. The pure `summarizeReviews` / `toReviewDto` mappers are DB-free so
 * they can be unit-tested, matching the repo convention (see `notifications.ts`).
 */

import { prisma } from '@/lib/prisma';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
  student: { fullName: string | null; email: string } | null;
};

export type ReviewDto = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author: string;
  created_at: string;
};

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

/** First name (or email local-part) only — never leak a reviewer's full identity publicly. */
function displayAuthor(student: ReviewRow['student']): string {
  const name = student?.fullName?.trim();
  if (name) return name.split(/\s+/)[0]!;
  const email = student?.email;
  return email ? email.split('@')[0]! : 'Student';
}

/** Pure: map a persisted review row to the public DTO. */
export function toReviewDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
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
): Promise<{ id: string; title: string } | null> {
  return prisma.lmsCourse.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: { id: true, title: true },
  });
}

/** True if the student has any enrolment in the course (the gate to review it). */
export async function isEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  const enrolment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
  return enrolment !== null;
}

/** Published reviews for a course, newest first, plus the aggregate summary. */
export async function getCourseReviews(
  courseId: string
): Promise<{ reviews: ReviewDto[]; summary: ReviewSummary }> {
  const rows = await prisma.lmsCourseReview.findMany({
    where: { courseId, isPublished: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      student: { select: { fullName: true, email: true } },
    },
  });
  return { reviews: rows.map(toReviewDto), summary: summarizeReviews(rows) };
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
