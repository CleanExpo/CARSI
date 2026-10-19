/**
 * THE rule table for course reviews (release-gate r12) — the one source of truth every review
 * route consults and the route-matrix test generates its cases from, so a route cannot drift.
 *
 *   admin       a current admin (resolveCurrentAdmin: founder, DB-role admin, bootstrap or
 *               admin_users via the admin cookie)
 *   instructor  an LMS user whose CURRENT database role is instructor
 *   anyone      everyone else: learners, demoted or deactivated accounts, stale tokens, no session
 *
 * Hidden reviews may hold personal information or abuse, so only an admin may read them, reply to
 * them or draft a reply (which sends the text to an AI model). Instructors never moderate: that
 * would be a conflict of interest.
 */
import type { CurrentReviewManager } from '@/lib/server/current-admin';

export type ReviewPrincipal = 'admin' | 'instructor' | 'anyone';

export type ReviewCapability =
  'readPublished' | 'readHidden' | 'replyPublished' | 'replyHidden' | 'moderate';

export const REVIEW_ACCESS: Readonly<
  Record<ReviewPrincipal, Readonly<Record<ReviewCapability, boolean>>>
> = {
  admin: {
    readPublished: true,
    readHidden: true,
    replyPublished: true,
    replyHidden: true,
    moderate: true,
  },
  instructor: {
    readPublished: true,
    readHidden: false,
    replyPublished: true,
    replyHidden: false,
    moderate: false,
  },
  anyone: {
    readPublished: true,
    readHidden: false,
    replyPublished: false,
    replyHidden: false,
    moderate: false,
  },
};

/** Who a re-validated manager is in the table (null = not a current admin or instructor). */
export function reviewPrincipal(manager: CurrentReviewManager | null): ReviewPrincipal {
  if (!manager) return 'anyone';
  return manager.kind === 'lms_instructor' ? 'instructor' : 'admin';
}

export function mayReadReview(principal: ReviewPrincipal, isPublished: boolean): boolean {
  return REVIEW_ACCESS[principal][isPublished ? 'readPublished' : 'readHidden'];
}

/** Reply (publish or clear) — and draft one with AI, which also reads the review. */
export function mayReplyToReview(principal: ReviewPrincipal, isPublished: boolean): boolean {
  return (
    REVIEW_ACCESS[principal][isPublished ? 'replyPublished' : 'replyHidden'] &&
    mayReadReview(principal, isPublished)
  );
}

export function mayManageReplies(principal: ReviewPrincipal): boolean {
  return REVIEW_ACCESS[principal].replyPublished;
}

export function mayModerate(principal: ReviewPrincipal): boolean {
  return REVIEW_ACCESS[principal].moderate;
}
