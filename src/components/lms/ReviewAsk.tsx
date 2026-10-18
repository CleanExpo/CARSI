'use client';

import { useCallback, useEffect, useState } from 'react';

import { ReviewForm, type OwnReview } from '@/components/lms/ReviewForm';
import { apiClient } from '@/lib/api/client';
import { REVIEW_ASK_COPY } from '@/lib/reviews/review-ask';

type AskState = {
  review_ask?: boolean;
  own_review: OwnReview | null;
  reviewer_display_name?: string | null;
  google_review_url?: string | null;
};

/**
 * The completion review ask (spec 2026-10-18 D5, §10), for surfaces that do not already show the
 * course's review section (the player's completion state, the credential page).
 *
 * Whether it shows is decided by the server's `review_ask` — a completer (DB status `completed`
 * with `completed_at`) who has not reviewed yet — never by how the learner arrived on the page.
 * It is the same ask, in the same words, for everyone. After submitting, the form shows the same
 * thank-you for every rating; on the next load the ask is gone because a review exists.
 * Rendered as its own section, outside any live region, so typing is not re-announced.
 */
export function ReviewAsk({ slug }: { slug: string }) {
  const [state, setState] = useState<AskState | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await apiClient.get<AskState>(`/api/lms/courses/${encodeURIComponent(slug)}/reviews`));
    } catch {
      // Eligibility is unknown, so show nothing here; the course page and email still ask.
      setState(null);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same fetch-on-mount pattern as CourseReviews
    load();
  }, [load]);

  if (!state?.review_ask) return null;

  return (
    <section aria-label="Course review" className="mt-6" data-testid="review-ask">
      <ReviewForm
        slug={slug}
        heading={REVIEW_ASK_COPY.heading}
        intro={REVIEW_ASK_COPY.body}
        ownReview={state.own_review}
        reviewerDisplayName={state.reviewer_display_name ?? null}
        googleReviewUrl={state.google_review_url ?? null}
      />
    </section>
  );
}
