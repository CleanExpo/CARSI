/**
 * The public review policy (release-gate r4): lists every hide reason in the same order as the
 * moderation code, says negative reviews are never hidden, and that the average counts published
 * reviews only. Copy awaits Phill's AC-8 sign-off.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/review-policy',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ReviewPolicyBody } from '@/components/lms/ReviewPolicy';

import { REVIEW_HIDE_REASONS } from './review-ask';
import { REVIEW_HIDE_REASON_PUBLIC_LABELS, REVIEW_POLICY_COPY, REVIEW_POLICY_PATH } from './review-policy';

describe('public review policy', () => {
  it('names every hide reason the moderation code accepts, and nothing else', () => {
    expect(REVIEW_POLICY_COPY.reasons).toEqual(REVIEW_HIDE_REASONS.map((r) => REVIEW_HIDE_REASON_PUBLIC_LABELS[r]));
    expect(REVIEW_POLICY_COPY.reasons).toHaveLength(4);
    expect(REVIEW_POLICY_PATH).toBe('/review-policy');
  });

  it('the policy body renders the whole policy', () => {
    const html = renderToStaticMarkup(createElement(ReviewPolicyBody));
    for (const r of REVIEW_POLICY_COPY.reasons) expect(html).toContain(r.replace("'", '&#x27;'));
    expect(html).toContain('We never hide a review because it is negative or has a low rating.');
    expect(html).toContain('The average rating counts published reviews only.');
    expect(html).toContain('support@carsi.com.au');
  });
});
