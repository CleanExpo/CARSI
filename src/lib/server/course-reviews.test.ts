import { describe, expect, it } from 'vitest';

import {
  isValidRating,
  summarizeReviews,
  toReviewDto,
  type ReviewRow,
} from './course-reviews';

describe('isValidRating', () => {
  it('accepts integers 1–5 only', () => {
    expect([1, 2, 3, 4, 5].every(isValidRating)).toBe(true);
  });
  it('rejects out-of-range, non-integer, and non-number', () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
    expect(isValidRating('4')).toBe(false);
    expect(isValidRating(null)).toBe(false);
  });
});

describe('summarizeReviews', () => {
  it('returns zeroed summary for no reviews', () => {
    expect(summarizeReviews([])).toEqual({
      average: 0,
      count: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    });
  });

  it('computes average (rounded to 1dp), count, and per-star distribution', () => {
    const s = summarizeReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 2 }]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(3.8); // 15/4 = 3.75 -> 3.8
    expect(s.distribution).toEqual({ '1': 0, '2': 1, '3': 0, '4': 2, '5': 1 });
  });

  it('ignores invalid ratings so they never skew the average', () => {
    const s = summarizeReviews([{ rating: 5 }, { rating: 0 }, { rating: 9 }, { rating: 3 }]);
    expect(s.count).toBe(2);
    expect(s.average).toBe(4); // (5+3)/2
  });
});

describe('toReviewDto', () => {
  const base: ReviewRow = {
    id: 'r1',
    rating: 5,
    title: 'Excellent',
    body: 'Learned a lot.',
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    student: { fullName: 'Sam Rivers', email: 'sam@example.com' },
  };

  it('exposes only the reviewer first name and ISO date', () => {
    expect(toReviewDto(base)).toEqual({
      id: 'r1',
      rating: 5,
      title: 'Excellent',
      body: 'Learned a lot.',
      author: 'Sam',
      created_at: '2026-07-02T00:00:00.000Z',
    });
  });

  it('falls back to the email local-part, then "Student", when no name', () => {
    expect(toReviewDto({ ...base, student: { fullName: null, email: 'jo@carsi.com.au' } }).author).toBe('jo');
    expect(toReviewDto({ ...base, student: null }).author).toBe('Student');
  });
});
