/**
 * AC-5 (spec 2026-10-18 D15): no incentive, pre-written review text, pre-selected rating or
 * rating-conditioned routing anywhere in the review flow. The scan proves it can fire (planted
 * positive controls), proves it does not fire on the neutral prompts (negative control), and
 * refuses to pass over a missing or empty file (scope floor).
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REVIEW_FLOW_FILES, scanReviewFlowSource, type ReviewFlowRule } from './review-flow-compliance';

describe('scope floor', () => {
  it.each(REVIEW_FLOW_FILES)('%s exists and is non-empty', (file) => {
    const st = statSync(join(process.cwd(), file));
    expect(st.isFile()).toBe(true);
    expect(st.size).toBeGreaterThan(200);
  });
});

describe('the real review flow is clean', () => {
  it.each(REVIEW_FLOW_FILES)('%s has no findings', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(scanReviewFlowSource(source)).toEqual([]);
  });
});

describe('positive controls — each banned class is detected', () => {
  const planted: Array<[ReviewFlowRule, string]> = [
    ['incentive', '<p>Leave a review and get 10% off your next course</p>'],
    ['incentive', "const copy = 'Review us for a $20 off voucher';"],
    ['incentive', '<p>Every reviewer goes into the prize draw</p>'],
    ['incentive', '<p>Write a review to unlock a free module</p>'],
    ['incentive', 'body: `Thanks! Here is your discount code`'],
    ['prewritten_review_text', '<textarea placeholder="e.g. Great course, learned heaps" />'],
    ['prewritten_review_text', '<input defaultValue="Highly recommend this course" />'],
    ['prewritten_review_text', '<button>Spin the wheel for a review</button>'],
    ['prewritten_review_text', '<p>Pick a review from our suggested review list</p>'],
    ['preselected_rating', 'const [rating, setRating] = useState(5);'],
    ['preselected_rating', 'const [rating, setRating] = useState<number>(4);'],
    ['rating_conditioned', '{rating >= 4 && <a href={googleReviewUrl}>Review us on Google</a>}'],
    ['rating_conditioned', 'if (rating > 3) showGoogle = true;'],
    ['rating_conditioned', "const url = rating === 5 ? google : null;"],
    ['rating_conditioned', 'if (rating < 4) return null;'],
    ['rating_conditioned', 'if (4 <= rating) offerGoogle();'],
  ];
  it.each(planted)('%s: flags %s', (rule, snippet) => {
    expect(scanReviewFlowSource(snippet).map((f) => f.rule)).toContain(rule);
  });
});

describe('negative controls — neutral prompts and the no-star check pass', () => {
  it.each([
    '<label>What did you think? (optional)</label>',
    '<label>Title (optional)</label>',
    "body: 'Help other technicians choose. Tell us what this course was like — in your own words.'",
    'if (rating < 1 || saving) return;',
    'disabled={rating < 1 || saving}',
    'const [rating, setRating] = useState(ownReview?.rating ?? 0);',
    '// No reward or incentive of any kind.',
    '/* never a discount for reviewing */',
    '<p>If you would like to, you can also review CARSI on Google.</p>',
    "href='https://carsi.com.au/unsubscribe?token=x'",
  ])('does not flag %s', (snippet) => {
    expect(scanReviewFlowSource(snippet)).toEqual([]);
  });
});
