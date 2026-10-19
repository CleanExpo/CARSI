/**
 * Admin review-ask funnel and moderation summary (spec 2026-10-18 D13; email stats split out, amendment 11).
 *
 * Read from the database, not client analytics (PostHog no-ops without a key and ad blockers
 * drop it), so a missing count means a real gap rather than a dropped event.
 */
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { prisma } from '@/lib/prisma';
import { getGoogleReviewLink } from '@/lib/server/course-reviews';

export type ReviewFunnelSummary = {
  completions: number;
  /** Completed enrolments with no review yet on courses that are asked — every one sees the in-app ask. */
  open_asks: number;
  reviews: { total: number; published: number; hidden: number };
  hides_by_reason_and_rating: Array<{ reason: string | null; rating: number; count: number }>;
  google_review_link: 'configured' | 'rejected' | 'absent';
};

/** The client the summary reads with: the shared client, or the transaction that authorised it. */
export type SummaryClient = Pick<
  typeof prisma,
  'lmsEnrollment' | '$queryRaw' | 'lmsCourseReview' | 'lmsCourseReviewModerationEvent' | 'lmsCourse'
>;

export async function getReviewFunnelSummary(db: SummaryClient = prisma): Promise<ReviewFunnelSummary> {
  const [completions, openAsksByCourse, total, published, hideGroups] = await Promise.all([
    db.lmsEnrollment.count({ where: { status: 'completed', completedAt: { not: null } } }),
    db.$queryRaw<Array<{ course_id: string; count: number }>>`
      SELECT e.course_id, count(*)::int AS count FROM lms_enrollments e
      WHERE e.status = 'completed' AND e.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lms_course_reviews r WHERE r.course_id = e.course_id AND r.student_id = e.student_id
        )
      GROUP BY e.course_id`,
    db.lmsCourseReview.count(),
    db.lmsCourseReview.count({ where: { isPublished: true } }),
    db.lmsCourseReviewModerationEvent.groupBy({
      by: ['reason', 'ratingAtAction'],
      where: { action: 'hide' },
      _count: { _all: true },
    }),
  ]);
  // Open asks use the same course rule as the ask itself (isReviewAskEligible): internal
  // onboarding programmes are never asked, so they are never counted as open asks.
  const courses = openAsksByCourse.length
    ? await db.lmsCourse.findMany({
        where: { id: { in: openAsksByCourse.map((r) => r.course_id) } },
        select: { id: true, slug: true, category: true, meta: true },
      })
    : [];
  const asked = new Set(courses.filter((c) => !isOnboardingCourse(c)).map((c) => c.id));
  const openAsks = openAsksByCourse.reduce((sum, r) => sum + (asked.has(r.course_id) ? r.count : 0), 0);

  return {
    completions,
    open_asks: openAsks,
    reviews: { total, published, hidden: total - published },
    hides_by_reason_and_rating: hideGroups
      .map((g) => ({ reason: g.reason, rating: g.ratingAtAction, count: g._count._all }))
      .sort((a, b) => a.rating - b.rating),
    google_review_link: getGoogleReviewLink().status,
  };
}
