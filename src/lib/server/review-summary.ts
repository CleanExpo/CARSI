/**
 * Admin review-ask funnel and moderation summary (spec 2026-10-18 D13).
 *
 * Read from the database, not client analytics (PostHog no-ops without a key and ad blockers
 * drop it), so a missing count means a real gap rather than a dropped event.
 */
import { prisma } from '@/lib/prisma';
import { getGoogleReviewLink } from '@/lib/server/course-reviews';
import { readReviewRequestConfig } from '@/lib/server/review-request-email';

export type ReviewFunnelSummary = {
  completions: number;
  /** Completed enrolments with no review yet — every one is being asked in-app (includes onboarding programmes, which are not asked). */
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
  const [completions, openAsksRows, total, published, emailGroups, hideGroups] = await Promise.all([
    prisma.lmsEnrollment.count({ where: { status: 'completed', completedAt: { not: null } } }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*)::int AS count FROM lms_enrollments e
      WHERE e.status = 'completed' AND e.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lms_course_reviews r WHERE r.course_id = e.course_id AND r.student_id = e.student_id
        )`,
    prisma.lmsCourseReview.count(),
    prisma.lmsCourseReview.count({ where: { isPublished: true } }),
    prisma.lmsReviewRequestEmail.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lmsCourseReviewModerationEvent.groupBy({
      by: ['reason', 'ratingAtAction'],
      where: { action: 'hide' },
      _count: { _all: true },
    }),
  ]);
  const config = readReviewRequestConfig(process.env);
  return {
    completions,
    open_asks: openAsksRows[0]?.count ?? 0,
    reviews: { total, published, hidden: total - published },
    review_request_emails: {
      enabled: config.enabled,
      disabled_reason: config.enabled ? null : config.reason,
      by_status: Object.fromEntries(emailGroups.map((g) => [g.status, g._count._all])),
    },
    hides_by_reason_and_rating: hideGroups
      .map((g) => ({ reason: g.reason, rating: g.ratingAtAction, count: g._count._all }))
      .sort((a, b) => a.rating - b.rating),
    google_review_link: getGoogleReviewLink().status,
  };
}
