/**
 * Admin review-ask funnel and moderation summary (spec 2026-10-18 D13).
 *
 * Read from the database, not client analytics (PostHog no-ops without a key and ad blockers
 * drop it), so a missing count means a real gap rather than a dropped event.
 */
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { prisma } from '@/lib/prisma';
import { getGoogleReviewLink } from '@/lib/server/course-reviews';
import { readReviewRequestSettings } from '@/lib/server/review-request-email';

export type ReviewFunnelSummary = {
  completions: number;
  /** Completed enrolments with no review yet on courses that are asked — every one sees the in-app ask. */
  open_asks: number;
  reviews: { total: number; published: number; hidden: number };
  review_request_emails: {
    enabled: boolean;
    disabled_reason: string | null;
    by_status: Record<string, number>;
  };
  hides_by_reason_and_rating: Array<{ reason: string | null; rating: number; count: number }>;
  google_review_link: 'configured' | 'rejected' | 'absent';
};

export async function getReviewFunnelSummary(): Promise<ReviewFunnelSummary> {
  const [completions, openAsksByCourse, total, published, emailGroups, hideGroups] = await Promise.all([
    prisma.lmsEnrollment.count({ where: { status: 'completed', completedAt: { not: null } } }),
    prisma.$queryRaw<Array<{ course_id: string; count: number }>>`
      SELECT e.course_id, count(*)::int AS count FROM lms_enrollments e
      WHERE e.status = 'completed' AND e.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lms_course_reviews r WHERE r.course_id = e.course_id AND r.student_id = e.student_id
        )
      GROUP BY e.course_id`,
    prisma.lmsCourseReview.count(),
    prisma.lmsCourseReview.count({ where: { isPublished: true } }),
    prisma.lmsReviewRequestEmail.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lmsCourseReviewModerationEvent.groupBy({
      by: ['reason', 'ratingAtAction'],
      where: { action: 'hide' },
      _count: { _all: true },
    }),
  ]);
  // Open asks use the same course rule as the ask itself (isReviewAskEligible): internal
  // onboarding programmes are never asked, so they are never counted as open asks.
  const courses = openAsksByCourse.length
    ? await prisma.lmsCourse.findMany({
        where: { id: { in: openAsksByCourse.map((r) => r.course_id) } },
        select: { id: true, slug: true, category: true, meta: true },
      })
    : [];
  const asked = new Set(courses.filter((c) => !isOnboardingCourse(c)).map((c) => c.id));
  const openAsks = openAsksByCourse.reduce((sum, r) => sum + (asked.has(r.course_id) ? r.count : 0), 0);

  const settings = await readReviewRequestSettings();
  return {
    completions,
    open_asks: openAsks,
    reviews: { total, published, hidden: total - published },
    review_request_emails: {
      enabled: settings.enabled,
      disabled_reason: settings.missing ? 'settings_missing' : settings.enabled ? null : 'disabled',
      by_status: Object.fromEntries(emailGroups.map((g) => [g.status, g._count._all])),
    },
    hides_by_reason_and_rating: hideGroups
      .map((g) => ({ reason: g.reason, rating: g.ratingAtAction, count: g._count._all }))
      .sort((a, b) => a.rating - b.rating),
    google_review_link: getGoogleReviewLink().status,
  };
}
