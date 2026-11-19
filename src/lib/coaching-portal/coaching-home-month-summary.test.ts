import { describe, expect, it } from 'vitest';

import { buildCoachingHomeMonthSummary } from './coaching-home-month-summary';

describe('buildCoachingHomeMonthSummary', () => {
  it('mentions proposed fixes when waiting on coach', () => {
    const s = buildCoachingHomeMonthSummary({
      completedThisMonth: 1,
      totalThisMonth: 3,
      proposedFixCount: 2,
      marketingHasPack: true,
      profileReady: true,
      nextActionTitle: 'Post three social drafts',
    });
    expect(s.lines.some((l) => l.includes('2 marketing fixes'))).toBe(true);
    expect(s.tone).toBe('attention');
  });
});