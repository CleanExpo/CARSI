// @vitest-environment jsdom
/**
 * AC-1 / AC-2 on the RENDERED components (spec 2026-10-18 D5, D7, D14; bench: eng-frontend,
 * eng-test): the ask shows for every completer from server state, the thank-you is identical
 * for ratings 1 to 5, and the Google link is offered after any rating or not at all.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: mocks.get, post: mocks.post },
  ApiClientError: class ApiClientError extends Error {},
}));

import { CourseReviews } from './CourseReviews';
import { ReviewAsk } from './ReviewAsk';
import { ReviewForm } from './ReviewForm';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOOGLE = 'https://g.page/r/CARSIexample123/review';
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.post.mockResolvedValue({ ok: true });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
function star(n: number): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>(`[role="radio"][aria-label^="${n} star"]`);
  if (!el) throw new Error(`star ${n} missing`);
  return el;
}
function submitButton(): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!el) throw new Error('submit missing');
  return el;
}

/** Render the form, pick `rating`, submit, and return the thank-you markup. */
async function thankYouAfter(rating: number, googleReviewUrl: string | null): Promise<string> {
  // Fresh mount per rating so no state carries over between submissions.
  act(() => root.unmount());
  root = createRoot(container);
  act(() => {
    root.render(
      <ReviewForm
        slug="water-damage"
        heading="How was this course?"
        ownReview={null}
        reviewerDisplayName="Sam"
        googleReviewUrl={googleReviewUrl}
      />
    );
  });
  act(() => star(rating).click());
  await act(async () => {
    submitButton().click();
  });
  await flush();
  const thanks = container.querySelector('[data-testid="review-thank-you"]');
  if (!thanks) throw new Error('thank-you missing');
  return thanks.outerHTML;
}

describe('thank-you is identical for every rating (AC-1, AC-2)', () => {
  it.each([[GOOGLE], [null]])('Google link %s: ratings 1-5 produce the same markup', async (url) => {
    const markups: string[] = [];
    for (const rating of [1, 2, 3, 4, 5]) {
      markups.push(await thankYouAfter(rating, url));
      expect(mocks.post).toHaveBeenLastCalledWith('/api/lms/courses/water-damage/reviews', expect.objectContaining({ rating }));
    }
    expect(new Set(markups).size).toBe(1);
  });

  it('offers the configured Google link after a 1-star review, safely', async () => {
    await thankYouAfter(1, GOOGLE);
    const link = container.querySelector<HTMLAnchorElement>('[data-testid="review-thank-you"] a');
    expect(link?.getAttribute('href')).toBe(GOOGLE);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows no Google link at all when none is configured', async () => {
    await thankYouAfter(5, null);
    expect(container.querySelector('[data-testid="review-thank-you"] a')).toBeNull();
  });
});

describe('the form asks for the learner’s own words (AC-5 support, D8)', () => {
  it('starts with no stars chosen, empty fields and labelled inputs; shows the public name', () => {
    act(() => {
      root.render(
        <ReviewForm slug="s" heading="How was this course?" ownReview={null} reviewerDisplayName="CARSI learner" googleReviewUrl={null} />
      );
    });
    expect(container.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(0);
    expect(submitButton().disabled).toBe(true);
    const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    for (const el of inputs) {
      expect(el.value).toBe('');
      expect(el.getAttribute('placeholder')).toBeNull();
      expect(container.querySelector(`label[for="${el.id}"]`)).not.toBeNull();
    }
    expect(container.textContent).toContain('Your review will appear publicly as CARSI learner');
  });

  it('arrow keys move the rating within the radio group (one tab stop)', () => {
    act(() => {
      root.render(<ReviewForm slug="s" heading="h" ownReview={null} reviewerDisplayName={null} googleReviewUrl={null} />);
    });
    expect([...container.querySelectorAll('[role="radio"]')].filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
    act(() => {
      star(1).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(star(2).getAttribute('aria-checked')).toBe('true');
  });
});

const askPayload = {
  reviews: [],
  summary: { average: 0, count: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
  can_review: true,
  can_manage: false,
  can_moderate: false,
  own_review: null,
  reviewer_display_name: 'Sam',
  google_review_url: GOOGLE,
};

describe('the ask is driven by server state, identically on every surface (AC-1, D5)', () => {
  it('ReviewAsk renders the ask copy when review_ask is true', async () => {
    mocks.get.mockResolvedValue({ ...askPayload, review_ask: true });
    act(() => root.render(<ReviewAsk slug="water-damage" />));
    await flush();
    expect(container.querySelector('[data-testid="review-ask"]')).not.toBeNull();
    expect(container.textContent).toContain('How was this course?');
    expect(container.textContent).toContain('Help other technicians choose. Tell us what this course was like — in your own words.');
  });

  it('ReviewAsk renders nothing when review_ask is false (already reviewed or not a completer)', async () => {
    mocks.get.mockResolvedValue({ ...askPayload, review_ask: false });
    act(() => root.render(<ReviewAsk slug="water-damage" />));
    await flush();
    expect(container.innerHTML).toBe('');
  });

  it('the course-page review section shows the same ask copy for a completer', async () => {
    mocks.get.mockResolvedValue({ ...askPayload, review_ask: true });
    act(() => root.render(<CourseReviews slug="water-damage" />));
    await flush();
    const form = container.querySelector('form');
    expect(form?.textContent).toContain('How was this course?');
    expect(form?.textContent).toContain('in your own words');
  });

  it('a failed reviews load says so, never "No reviews yet"', async () => {
    mocks.get.mockRejectedValue(new Error('500'));
    act(() => root.render(<CourseReviews slug="water-damage" />));
    await flush();
    expect(container.textContent).toContain('Reviews could not load.');
    expect(container.textContent).not.toContain('No reviews yet');
  });
});

describe('the moderation policy sits beside the rating (release-gate r4, ACCC guidance)', () => {
  it.each([
    ['with published reviews', { count: 2, average: 4.5 }],
    ['with no reviews yet', { count: 0, average: 0 }],
  ])('%s: the learner review section discloses how reviews are moderated', async (_label, summary) => {
    mocks.get.mockResolvedValue({
      ...askPayload,
      review_ask: false,
      summary: { ...summary, distribution: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 } },
      reviews: summary.count
        ? [{ id: 'r1', rating: 5, title: null, body: 'Good', reply: null, replied_at: null, is_published: true, author: 'Sam', created_at: '2026-10-01T00:00:00.000Z' }]
        : [],
    });
    act(() => root.render(<CourseReviews slug="water-damage" />));
    await flush();
    const policy = container.querySelector('[data-testid="review-policy"]');
    expect(policy).not.toBeNull();
    const text = policy!.textContent ?? '';
    expect(text).toContain('How we moderate reviews');
    expect(text).toContain('We never hide a review because it is negative or has a low rating.');
    for (const reason of ['offensive or abusive', "someone's personal information", 'not about this course', 'spam or fake']) {
      expect(text).toContain(reason);
    }
    expect(text).toContain('The average rating counts published reviews only.');
    expect(policy!.querySelector('a[href="/review-policy"]')).not.toBeNull();
  });
});
