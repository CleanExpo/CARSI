import { describe, expect, it } from 'vitest';

import {
  COACH_FEEDBACK_MAX_CHARS,
  normalizeCoachFeedback,
} from '@/lib/coaching-portal/marketing-pack/coach-input-limits';

describe('normalizeCoachFeedback', () => {
  it('returns null for empty input', () => {
    expect(normalizeCoachFeedback('')).toBeNull();
    expect(normalizeCoachFeedback('   ')).toBeNull();
    expect(normalizeCoachFeedback(undefined)).toBeNull();
  });

  it('caps length', () => {
    const long = 'x'.repeat(COACH_FEEDBACK_MAX_CHARS + 50);
    expect(normalizeCoachFeedback(long)?.length).toBe(COACH_FEEDBACK_MAX_CHARS);
  });
});
