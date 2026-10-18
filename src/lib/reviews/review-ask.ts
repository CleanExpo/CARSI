/**
 * Compliant review ask (spec 2026-10-18-reviews-local-geo, D2/D5/D7/D8).
 *
 * Every learner who completes a course is asked the same way, in their own words, with no
 * reward and no rating-dependent routing (ACCC online-review guidance; Google review policy).
 * The functions that decide the ask and the Google link deliberately take NO rating, score or
 * satisfaction argument — rating-blindness is a type, not a convention. Pure and client-safe
 * (no prisma, no env reads) so both the API routes and the components import it.
 */

/** Wire values for a hide reason. Labels live in the UI only. */
export const REVIEW_HIDE_REASONS = [
  'offensive',
  'personal_information',
  'not_about_course',
  'spam_or_fake',
] as const;

export type ReviewHideReason = (typeof REVIEW_HIDE_REASONS)[number];

export function isHideReason(value: unknown): value is ReviewHideReason {
  return typeof value === 'string' && (REVIEW_HIDE_REASONS as readonly string[]).includes(value);
}

/** Public author label when a reviewer has no name on file — never derived from their email. */
export const ANONYMOUS_REVIEWER_LABEL = 'CARSI learner';

/** The one ask, shown identically to every completer on every surface (spec §10). */
export const REVIEW_ASK_COPY = {
  heading: 'How was this course?',
  body: 'Help other technicians choose. Tell us what this course was like — in your own words.',
} as const;

/**
 * Thank-you shown after ANY submitted rating. The Google line is the same for 1 to 5 stars
 * and appears only when a genuine Google review link is configured.
 */
export const REVIEW_THANK_YOU_COPY = {
  heading: 'Thanks for your review',
  body: 'Your review is saved and helps other technicians choose a course.',
  google: 'If you would like to, you can also review CARSI on Google.',
  googleLink: 'Review CARSI on Google',
} as const;

export type ReviewAskEnrolment = {
  status: string | null | undefined;
  completedAt: Date | string | null | undefined;
  /** True for internal staff onboarding programmes, which are not public catalogue courses. */
  isOnboardingCourse: boolean;
};

/**
 * The single "is this learner a completer we ask?" predicate (D5). It uses the certificate
 * truth — DB status `completed` with `completed_at` set — not client lesson progress, so the
 * player, the dashboard, the credential page and the email all agree on who is asked.
 */
export function isReviewAskEligible(enrolment: ReviewAskEnrolment): boolean {
  if (enrolment.isOnboardingCourse) return false;
  if (enrolment.status?.trim().toLowerCase() !== 'completed') return false;
  if (enrolment.completedAt == null) return false;
  const at = enrolment.completedAt instanceof Date ? enrolment.completedAt : new Date(enrolment.completedAt);
  return !Number.isNaN(at.getTime());
}

/** Ask once: an eligible completer who has not reviewed yet (a hidden review still counts as reviewed). */
export function shouldShowReviewAsk(input: { eligible: boolean; hasOwnReview: boolean }): boolean {
  return input.eligible && !input.hasOwnReview;
}

export type GoogleReviewUrlStatus = 'configured' | 'rejected' | 'absent';

const G_PAGE = /^https:\/\/g\.page\/r\/[A-Za-z0-9_-]+(?:\/review)?\/?$/;
const PLACE_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Validate GOOGLE_REVIEW_URL (D7). Accepts only the two genuine Google review-link forms:
 * `https://g.page/r/<id>[/review]` and `https://search.google.com/local/writereview?placeid=<id>`.
 * Anything else — http, lookalike hosts, a missing place id, padding — is rejected, so a
 * misconfigured value can never send learners somewhere that is not Google.
 * Takes no rating: the link is offered to every reviewer or to none.
 */
export function resolveGoogleReviewUrl(raw: string | null | undefined): {
  url: string | null;
  status: GoogleReviewUrlStatus;
} {
  if (raw == null || raw === '') return { url: null, status: 'absent' };
  if (raw !== raw.trim()) return { url: null, status: 'rejected' };
  if (G_PAGE.test(raw)) return { url: raw, status: 'configured' };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { url: null, status: 'rejected' };
  }
  const params = [...parsed.searchParams.keys()];
  const placeId = parsed.searchParams.get('placeid');
  const ok =
    parsed.protocol === 'https:' &&
    parsed.hostname === 'search.google.com' &&
    parsed.port === '' &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.pathname === '/local/writereview' &&
    parsed.hash === '' &&
    params.length === 1 &&
    placeId !== null &&
    PLACE_ID.test(placeId);
  return ok ? { url: raw, status: 'configured' } : { url: null, status: 'rejected' };
}
