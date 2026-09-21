import { describe, expect, it } from 'vitest';

import { resolveHomeContinueState } from './learner-home-state';

describe('resolveHomeContinueState', () => {
  it('uses resume when a snapshot exists', () => {
    expect(
      resolveHomeContinueState({
        hasResume: true,
        inProgressCount: 2,
        enrolledCount: 2,
        completedCount: 0,
      })
    ).toBe('resume');
  });

  it('starts an enrolled course that has not been opened', () => {
    expect(
      resolveHomeContinueState({
        hasResume: false,
        inProgressCount: 1,
        enrolledCount: 1,
        completedCount: 0,
      })
    ).toBe('start');
  });

  it('prompts browse when there are no enrolments', () => {
    expect(
      resolveHomeContinueState({
        hasResume: false,
        inProgressCount: 0,
        enrolledCount: 0,
        completedCount: 0,
      })
    ).toBe('empty');
  });

  it('shows complete when every enrolment is finished', () => {
    expect(
      resolveHomeContinueState({
        hasResume: false,
        inProgressCount: 0,
        enrolledCount: 2,
        completedCount: 2,
      })
    ).toBe('complete');
  });
});
