import { describe, expect, it } from 'vitest';

import {
  canManageReviews,
  canModerateReviews,
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
    reply: null,
    repliedAt: null,
    isPublished: true,
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    student: { fullName: 'Sam Rivers', email: 'sam@example.com' },
  };

  it('exposes only the reviewer first name and ISO date, null reply by default', () => {
    expect(toReviewDto(base)).toEqual({
      id: 'r1',
      rating: 5,
      title: 'Excellent',
      body: 'Learned a lot.',
      reply: null,
      replied_at: null,
      is_published: true,
      author: 'Sam',
      created_at: '2026-07-02T00:00:00.000Z',
    });
  });

  it('includes an instructor reply + ISO replied_at when present', () => {
    const dto = toReviewDto({
      ...base,
      reply: 'Thanks for the feedback!',
      repliedAt: new Date('2026-07-03T00:00:00.000Z'),
    });
    expect(dto.reply).toBe('Thanks for the feedback!');
    expect(dto.replied_at).toBe('2026-07-03T00:00:00.000Z');
  });

  it.each([
    ['the stored local part (guest sign-up placeholder)', 'john.smith.waterdamage', 'john.smith.waterdamage@gmail.com'],
    ['the local part with different punctuation and case', 'John_Smith.WaterDamage', 'john.smith.waterdamage@gmail.com'],
    ['the whole address', 'john@example.com', 'john@example.com'],
    ['any address at all', 'contact me at jo@site.com', 'sam@example.com'],
  ])('r8: a name that is %s is never published', (_label, fullName, email) => {
    expect(toReviewDto({ ...base, student: { fullName, email } }).author).toBe('CARSI learner');
  });

  it('r8: an independently supplied name is still shown as its first name', () => {
    expect(toReviewDto({ ...base, student: { fullName: 'Sam Rivers', email: 'sam@example.com' } }).author).toBe('Sam');
    expect(toReviewDto({ ...base, student: { fullName: 'Ngaio Marsh', email: 'nm1987@example.com' } }).author).toBe('Ngaio');
  });

  it('falls back to a neutral label — never the email — when no name (spec D8)', () => {
    expect(toReviewDto({ ...base, student: { fullName: null, email: 'jo@example.com' } }).author).toBe('CARSI learner');
    expect(toReviewDto({ ...base, student: null }).author).toBe('CARSI learner');
  });
});

describe('canManageReviews', () => {
  it('allows admin and instructor only', () => {
    expect(canManageReviews('admin')).toBe(true);
    expect(canManageReviews('instructor')).toBe(true);
    expect(canManageReviews('student')).toBe(false);
    expect(canManageReviews(null)).toBe(false);
    expect(canManageReviews(undefined)).toBe(false);
  });
});

describe('canModerateReviews', () => {
  it('allows admin only (instructors have a conflict of interest)', () => {
    expect(canModerateReviews('admin')).toBe(true);
    expect(canModerateReviews('instructor')).toBe(false);
    expect(canModerateReviews('student')).toBe(false);
    expect(canModerateReviews(null)).toBe(false);
  });
});
