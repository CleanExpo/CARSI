import { describe, expect, it } from 'vitest';

import { computeQuizResult, decideEnrollmentCompleted } from './lms-completion';

describe('computeQuizResult', () => {
  it('passes when the unrounded ratio meets the threshold', () => {
    expect(computeQuizResult(7, 10, 70)).toEqual({ scorePercent: 70, passed: true });
  });

  it('does NOT let a rounded-up sub-threshold score pass (69.5% vs 70)', () => {
    // 139/200 = 69.5% rounds to 70 for display but must fail a 70 gate.
    const r = computeQuizResult(139, 200, 70);
    expect(r.scorePercent).toBe(70);
    expect(r.passed).toBe(false);
  });

  it('fails clearly below threshold', () => {
    expect(computeQuizResult(5, 10, 70)).toEqual({ scorePercent: 50, passed: false });
  });

  it('handles a zero-point quiz without dividing by zero', () => {
    expect(computeQuizResult(0, 0, 70)).toEqual({ scorePercent: 0, passed: false });
  });

  it('passes a perfect score', () => {
    expect(computeQuizResult(10, 10, 70)).toEqual({ scorePercent: 100, passed: true });
  });
});

describe('decideEnrollmentCompleted', () => {
  it('completes when lessons done and quiz gate satisfied', () => {
    expect(
      decideEnrollmentCompleted({ allLessonsDone: true, quizGateSatisfied: true, wasAlreadyCompleted: false }),
    ).toBe(true);
  });

  it('does NOT complete when lessons done but a required quiz is unpassed', () => {
    expect(
      decideEnrollmentCompleted({ allLessonsDone: true, quizGateSatisfied: false, wasAlreadyCompleted: false }),
    ).toBe(false);
  });

  it('does NOT complete when quizzes passed but lessons incomplete', () => {
    expect(
      decideEnrollmentCompleted({ allLessonsDone: false, quizGateSatisfied: true, wasAlreadyCompleted: false }),
    ).toBe(false);
  });

  it('never downgrades an already-completed enrollment (no retroactive revoke)', () => {
    expect(
      decideEnrollmentCompleted({ allLessonsDone: false, quizGateSatisfied: false, wasAlreadyCompleted: true }),
    ).toBe(true);
  });
});
