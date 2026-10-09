import { describe, expect, it } from 'vitest';

import { isLearningRoute, shouldShowOnboardingWizard } from './wizard-gate';

describe('isLearningRoute (GP-593)', () => {
  it.each([
    '/dashboard/learn/water-damage-101',
    '/dashboard/learn/water-damage-101/',
    '/dashboard/courses/water-damage-101/lessons/abc',
    '/dashboard/courses/water-damage-101/quiz/q1',
  ])('treats %s as a learning page', (p) => {
    expect(isLearningRoute(p)).toBe(true);
  });

  it.each(['/dashboard', '/dashboard/student', '/dashboard/courses', '/dashboard/learn', '/courses/x', null, undefined])(
    'does not treat %s as a learning page',
    (p) => {
      expect(isLearningRoute(p)).toBe(false);
    }
  );
});

describe('shouldShowOnboardingWizard (GP-593)', () => {
  const base = { onboardingCompleted: false, pathname: '/dashboard/student', skippedThisSession: false };

  it('shows on an ordinary dashboard page for a learner who has not onboarded', () => {
    expect(shouldShowOnboardingWizard(base)).toBe(true);
  });

  it('does not cover the first lesson after free enrolment', () => {
    expect(shouldShowOnboardingWizard({ ...base, pathname: '/dashboard/learn/water-damage-101' })).toBe(false);
  });

  it('stays closed after Skip for the rest of the session', () => {
    expect(shouldShowOnboardingWizard({ ...base, skippedThisSession: true })).toBe(false);
  });

  it('never shows once onboarding is complete', () => {
    expect(shouldShowOnboardingWizard({ ...base, onboardingCompleted: true })).toBe(false);
  });
});
