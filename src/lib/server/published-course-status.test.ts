import { describe, expect, it } from 'vitest';

import { isPublishedCourseStatus, lmsPublishedCourseWhere } from './public-courses-list';

/**
 * Guards a split-brain, not a string comparison.
 *
 * `status` is the canonical publication flag (#137); `isPublished` is a legacy dual-write column.
 * Two routes were still filtering courses on the legacy field while the public catalogue used the
 * canonical one, and 20 courses currently carry status='published' with isPublished=false — so
 * those courses were enrollable from the catalogue and simultaneously invisible in pathways and
 * team assignment.
 *
 * The dangerous case is DRIFT: the Prisma predicate matches case-insensitively, so an in-memory
 * check that did not would disagree with the database on the same row. That equivalence is
 * asserted here rather than assumed.
 */
describe('isPublishedCourseStatus', () => {
  it('accepts the canonical value', () => {
    expect(isPublishedCourseStatus('published')).toBe(true);
  });

  it('matches case-insensitively, exactly as the Prisma predicate does', () => {
    // lmsPublishedCourseWhere declares mode: 'insensitive' — if this ever diverges, the database
    // and the in-memory filter disagree about the same course.
    expect((lmsPublishedCourseWhere.status as { mode?: string }).mode).toBe('insensitive');
    expect(isPublishedCourseStatus('Published')).toBe(true);
    expect(isPublishedCourseStatus('PUBLISHED')).toBe(true);
  });

  it('agrees with Prisma on padded status rather than tolerating it', () => {
    // Prisma's `equals: 'published', mode: 'insensitive'` does not trim, so a padded value
    // is NOT published in the database. This predicate must return the same answer, or a
    // course becomes visible in in-memory pathway filters while every query excludes it.
    expect(isPublishedCourseStatus('  published  ')).toBe(false);
  });

  it('rejects draft, the state that must never reach a learner', () => {
    expect(isPublishedCourseStatus('draft')).toBe(false);
    expect(isPublishedCourseStatus('DRAFT')).toBe(false);
  });

  it('rejects absent status rather than defaulting to visible', () => {
    expect(isPublishedCourseStatus(null)).toBe(false);
    expect(isPublishedCourseStatus(undefined)).toBe(false);
    expect(isPublishedCourseStatus('')).toBe(false);
  });

  it('does not substring-match a longer status', () => {
    expect(isPublishedCourseStatus('unpublished')).toBe(false);
    expect(isPublishedCourseStatus('published-pending')).toBe(false);
  });
});
