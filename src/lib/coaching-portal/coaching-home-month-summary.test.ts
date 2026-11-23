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
    expect(s.ctas[0]?.label).toMatch(/proposed fix/);
    expect(s.ctas[0]?.variant).toBe('primary');
  });

  // GP-781: every CTA set includes a label the home page uses to hide the "Your next action"
  // card, so the summary line is the only place the member sees the next action. It must
  // carry the due date, or the date is never shown.
  it('names the next action due date in the summary line', () => {
    const s = buildCoachingHomeMonthSummary({
      completedThisMonth: 0,
      totalThisMonth: 2,
      proposedFixCount: 0,
      marketingHasPack: true,
      profileReady: true,
      nextActionTitle: 'Post three social drafts',
      nextActionDueLabel: '3 Dec',
    });
    expect(s.lines).toContain('Next up: Post three social drafts (due 3 Dec)');
  });

  it('leaves the next-action line unchanged when no due date is set', () => {
    const s = buildCoachingHomeMonthSummary({
      completedThisMonth: 0,
      totalThisMonth: 2,
      proposedFixCount: 0,
      marketingHasPack: true,
      profileReady: true,
      nextActionTitle: 'Post three social drafts',
      nextActionDueLabel: null,
    });
    expect(s.lines).toContain('Next up: Post three social drafts');
  });
});