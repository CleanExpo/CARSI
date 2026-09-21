export type HomeContinueState = 'resume' | 'start' | 'empty' | 'complete';

/** Decide the Home continue-learning block from real enrolment + resume data. */
export function resolveHomeContinueState(input: {
  hasResume: boolean;
  inProgressCount: number;
  enrolledCount: number;
  completedCount: number;
}): HomeContinueState {
  if (input.hasResume) return 'resume';
  if (input.inProgressCount > 0) return 'start';
  if (input.enrolledCount === 0) return 'empty';
  if (input.completedCount === input.enrolledCount && input.enrolledCount > 0) return 'complete';
  return 'empty';
}
