/**
 * AC-1 / AC-2 (spec 2026-10-18 D5, D7, D14): the ask and the Google link are decided without
 * any rating. Rating-blindness is asserted at the type level as well as by behaviour.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isHideReason,
  isReviewAskEligible,
  resolveGoogleReviewUrl,
  REVIEW_HIDE_REASONS,
  shouldMountPlayerReviewAsk,
  shouldShowReviewAsk,
  type ReviewAskEnrolment,
} from './review-ask';

const done = { status: 'completed', completedAt: new Date('2026-10-01T00:00:00Z'), isOnboardingCourse: false };

describe('isReviewAskEligible — one predicate for every surface (D5)', () => {
  it('asks a completer (DB status completed with completed_at)', () => {
    expect(isReviewAskEligible(done)).toBe(true);
    expect(isReviewAskEligible({ ...done, completedAt: '2026-10-01T00:00:00.000Z' })).toBe(true);
  });

  it.each([
    ['active learner', { ...done, status: 'active' }],
    ['revoked (refunded) enrolment', { ...done, status: 'revoked' }],
    ['completed status but no completion time', { ...done, completedAt: null }],
    ['unparseable completion time', { ...done, completedAt: 'not a date' }],
    ['internal onboarding programme', { ...done, isOnboardingCourse: true }],
    ['missing status', { ...done, status: null }],
  ])('does not ask: %s', (_label, enrolment) => {
    expect(isReviewAskEligible(enrolment as ReviewAskEnrolment)).toBe(false);
  });

  it('takes no rating, score or satisfaction input (type-level)', () => {
    type Input = Parameters<typeof isReviewAskEligible>[0];
    expectTypeOf<keyof Input>().toEqualTypeOf<'status' | 'completedAt' | 'isOnboardingCourse'>();
    type AskInput = Parameters<typeof shouldShowReviewAsk>[0];
    expectTypeOf<keyof AskInput>().toEqualTypeOf<'eligible' | 'hasOwnReview'>();
  });

  it('the player mounts the ask for every non-onboarding course, whatever the lesson flags say', () => {
    // A completed enrolment can show an incomplete lesson after the curriculum changes; the
    // server's review_ask decides, so the mount decision takes no lesson-progress input at all.
    expectTypeOf<keyof Parameters<typeof shouldMountPlayerReviewAsk>[0]>().toEqualTypeOf<'isOnboardingProgram'>();
    expect(shouldMountPlayerReviewAsk({ isOnboardingProgram: false })).toBe(true);
    expect(shouldMountPlayerReviewAsk({ isOnboardingProgram: true })).toBe(false);
  });

  it('LearnCourseShell mounts ReviewAsk only through that decision, never gated on lesson state (structural)', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/lms/LearnCourseShell.tsx'), 'utf8');
    const mounts = shell.split('\n').filter((line) => line.includes('<ReviewAsk'));
    expect(mounts).toHaveLength(1);
    expect(mounts[0]).toContain('shouldMountPlayerReviewAsk({ isOnboardingProgram })');
    expect(mounts[0]).not.toMatch(/allLessonsComplete|completed|percent|progress/i);
  });

  it('asks once: never after a review exists', () => {
    expect(shouldShowReviewAsk({ eligible: true, hasOwnReview: false })).toBe(true);
    expect(shouldShowReviewAsk({ eligible: true, hasOwnReview: true })).toBe(false);
    expect(shouldShowReviewAsk({ eligible: false, hasOwnReview: false })).toBe(false);
  });
});

describe('resolveGoogleReviewUrl — genuine Google review links only (D7)', () => {
  it.each([
    'https://g.page/r/CARSIexample123',
    'https://g.page/r/CARSIexample123/review',
    'https://g.page/r/Cd-_x9/review/',
    'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
  ])('accepts %s', (url) => {
    expect(resolveGoogleReviewUrl(url)).toEqual({ url, status: 'configured' });
  });

  it.each([
    ['http, not https', 'http://g.page/r/CARSIexample123'],
    ['lookalike host', 'https://g.page.evil.com/r/abc'],
    ['lookalike host (prefix)', 'https://evilg.page/r/abc'],
    ['writereview without placeid', 'https://search.google.com/local/writereview'],
    ['writereview with empty placeid', 'https://search.google.com/local/writereview?placeid='],
    ['writereview with an extra param', 'https://search.google.com/local/writereview?placeid=abc&utm_source=x'],
    ['writereview on another host', 'https://search.google.com.evil.io/local/writereview?placeid=abc'],
    ['writereview with credentials', 'https://user:pw@search.google.com/local/writereview?placeid=abc'],
    ['google maps page, not a review link', 'https://maps.google.com/?cid=123'],
    ['leading whitespace', ' https://g.page/r/CARSIexample123'],
    ['trailing newline', 'https://g.page/r/CARSIexample123\n'],
    ['g.page with a path traversal', 'https://g.page/r/abc/../../x'],
    ['not a URL', 'review us on google'],
  ])('rejects %s', (_label, url) => {
    expect(resolveGoogleReviewUrl(url)).toEqual({ url: null, status: 'rejected' });
  });

  it('reports an unset value as absent, distinct from rejected', () => {
    expect(resolveGoogleReviewUrl(undefined)).toEqual({ url: null, status: 'absent' });
    expect(resolveGoogleReviewUrl('')).toEqual({ url: null, status: 'absent' });
  });

  it('takes only the configured value — no rating parameter exists', () => {
    expectTypeOf(resolveGoogleReviewUrl).parameters.toEqualTypeOf<[string | null | undefined]>();
  });
});

describe('hide reasons (D2)', () => {
  it('lists exactly the four policy reasons', () => {
    expect([...REVIEW_HIDE_REASONS]).toEqual(['offensive', 'personal_information', 'not_about_course', 'spam_or_fake']);
  });
  it('accepts only listed codes', () => {
    expect(REVIEW_HIDE_REASONS.every(isHideReason)).toBe(true);
    for (const bad of ['negative', 'low rating', 'Offensive', '', null, undefined, 3]) {
      expect(isHideReason(bad)).toBe(false);
    }
  });
});
