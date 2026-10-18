/**
 * Review-flow compliance scan (spec 2026-10-18 D15, AC-5).
 *
 * Under the ACCC's online-review guidance and Google's review policy the review flow must not:
 * offer an incentive for a review, put words in the reviewer's mouth, pre-select a rating, or
 * route reviewers differently by rating (e.g. send only 4-5 star reviewers to Google). This scan
 * is a backstop for code added later; the rendered-component tests are the primary oracle.
 *
 * Scope is an explicit file list (a glob that silently matches nothing would "pass"). The
 * instructor/admin AI reply-draft route is deliberately NOT in scope: it drafts the business's
 * public response, not the learner's review.
 */

/** Every file a learner's review ask, form, thank-you or email is built from. */
export const REVIEW_FLOW_FILES = [
  'src/components/lms/ReviewForm.tsx',
  'src/components/lms/ReviewAsk.tsx',
  'src/components/lms/CourseReviews.tsx',
  'src/lib/reviews/review-ask.ts',
  'src/lib/server/review-request-email.ts',
] as const;

export type ReviewFlowRule = 'incentive' | 'prewritten_review_text' | 'preselected_rating' | 'rating_conditioned';

export type ReviewFlowFinding = { rule: ReviewFlowRule; match: string };

const RULES: Array<{ rule: ReviewFlowRule; pattern: RegExp }> = [
  {
    rule: 'incentive',
    pattern:
      /\b(?:discount|voucher|coupon|promo(?:tion(?:al)?)? code|prize|giveaway|raffle|(?:lucky|prize) draw|enter(?:ed)? (?:into |in )?(?:a|the|our) draw|rewards?|bonus|cash ?back|gift ?card|loyalty points|reward points|free (?:course|module|month|access|upgrade|membership)|in return for (?:a|your) review|\d+\s?% off|\$\s?\d+ off|% off)\b/i,
  },
  {
    rule: 'prewritten_review_text',
    pattern:
      /\b(?:suggested review|sample review|example review|pre-?written|review template|pick a review|choose a review|spin the wheel|mystery wheel)\b|(?:placeholder|defaultValue)\s*=\s*\{?\s*["'`][^"'`]*\b(?:great|excellent|amazing|awesome|loved|recommend|learn(?:ed|t)|five stars|5 stars|best course|e\.g\.)/i,
  },
  {
    rule: 'preselected_rating',
    pattern: /\[\s*rating\s*,\s*setRating\s*\]\s*=\s*useState(?:<[^>]*>)?\(\s*[1-5]\b|\brating\s*:\s*[1-5]\s*[,}]/,
  },
  {
    // `rating < 1` is the "no star chosen yet" check and stays legal; any other comparison of
    // the learner's rating against a star level is routing by rating.
    rule: 'rating_conditioned',
    pattern: /\brating\s*(?:>=|>|===|==|!==|!=|<=)\s*[1-5]\b|\brating\s*<\s*[2-5]\b|\b[1-5]\s*(?:<=|<|===|==)\s*rating\b/,
  },
];

/** Remove // and /* *\/ comments so a comment saying "no reward" is not a finding. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

export function scanReviewFlowSource(source: string): ReviewFlowFinding[] {
  const code = stripComments(source);
  const findings: ReviewFlowFinding[] = [];
  for (const { rule, pattern } of RULES) {
    const m = code.match(pattern);
    if (m) findings.push({ rule, match: m[0] });
  }
  return findings;
}
