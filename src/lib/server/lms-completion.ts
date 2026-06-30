/**
 * Pure decision helpers for LMS completion + quiz grading.
 *
 * Extracted from the DB-bound services so the integrity rules (Phase 6 of the
 * 2026-06-29 audit) are unit-testable without a database:
 *  - a quiz passes on the UNROUNDED ratio (a raw 69.5% must NOT pass a 70 gate)
 *  - an enrollment only becomes "completed" when lessons AND required quizzes
 *    are done, but an already-completed enrollment is NEVER downgraded.
 */

export interface QuizResult {
  scorePercent: number;
  passed: boolean;
}

/**
 * Grade a quiz attempt. `scorePercent` is rounded for display only; the
 * pass/fail decision compares the UNROUNDED ratio so 69.5% does not round up
 * into a 70% pass.
 */
export function computeQuizResult(
  earned: number,
  totalPoints: number,
  passPercentage: number,
): QuizResult {
  const ratio = totalPoints > 0 ? (earned / totalPoints) * 100 : 0;
  return {
    scorePercent: Math.round(ratio),
    passed: ratio >= passPercentage,
  };
}

/**
 * Decide whether an enrollment is "completed".
 *
 * New completion requires all lessons done AND the quiz gate satisfied (all
 * course quizzes have a passing attempt, or the course has no quizzes, or an
 * admin override bypassed the gate). An enrollment that was ALREADY completed
 * stays completed — we never retroactively revoke a completion/certificate.
 */
export function decideEnrollmentCompleted(input: {
  allLessonsDone: boolean;
  quizGateSatisfied: boolean;
  wasAlreadyCompleted: boolean;
}): boolean {
  const newlyComplete = input.allLessonsDone && input.quizGateSatisfied;
  return input.wasAlreadyCompleted || newlyComplete;
}
