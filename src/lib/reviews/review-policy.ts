/**
 * Public review moderation policy (release-gate review r4; ACCC online-review guidance: show how
 * reviews are published, edited and removed). One source for the course-page disclosure, the
 * learner review section and the /review-policy page. Plain Australian English.
 * COPY STATUS: awaiting Phill's sign-off with the review ask and thank-you (AC-8).
 */
import { REVIEW_HIDE_REASONS, type ReviewHideReason } from '@/lib/reviews/review-ask';

export const REVIEW_POLICY_PATH = '/review-policy';

/** The sentence giving the date recording began, shown on the policy page when it is known. */
export function reviewAuditStartSentence(startedAt: Date | null): string | null {
  if (!startedAt) return null;
  const date = startedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane' });
  return `We began recording moderation decisions on ${date}.`;
}

/** Public wording for each hide reason; the order follows REVIEW_HIDE_REASONS. */
export const REVIEW_HIDE_REASON_PUBLIC_LABELS: Record<ReviewHideReason, string> = {
  offensive: 'it is offensive or abusive',
  personal_information: "it contains someone's personal information",
  not_about_course: 'it is not about this course',
  spam_or_fake: 'it is spam or fake',
};

export const REVIEW_POLICY_COPY = {
  title: 'How we moderate reviews',
  points: [
    'We ask every learner who completes a course for a review, in the same way. We never give anything for a review, and we never suggest what to write.',
    'Reviews are published as the learner wrote them, good or bad. We never hide a review because it is negative or has a low rating.',
    'We only hide a review if:',
  ],
  reasons: REVIEW_HIDE_REASONS.map((r) => REVIEW_HIDE_REASON_PUBLIC_LABELS[r]),
  after: [
    'Since we began recording moderation decisions, every review we hide is recorded with its reason, who hid it and when. Reviews hidden before then have no recorded reason, and we have not added one after the fact.',
    'The average rating counts published reviews only.',
    'Learners can edit their own review at any time, and our team may post a public reply.',
    'If you think a review was hidden by mistake, email support@carsi.com.au and we will look at it again.',
  ],
} as const;
