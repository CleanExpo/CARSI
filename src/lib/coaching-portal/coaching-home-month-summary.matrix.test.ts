import { describe, expect, it } from 'vitest';

import { buildCoachingHomeMonthSummary } from './coaching-home-month-summary';

const base = {
  completedThisMonth: 0,
  totalThisMonth: 0,
  proposedFixCount: 0,
  marketingHasPack: false,
  profileReady: false,
  nextActionTitle: null as string | null,
};

describe('buildCoachingHomeMonthSummary CTA priority', () => {
  it('prioritises proposed fixes over everything else', () => {
    const s = buildCoachingHomeMonthSummary({
      ...base,
      proposedFixCount: 3,
      profileReady: true,
      nextActionTitle: 'Post drafts',
      totalThisMonth: 5,
      completedThisMonth: 1,
    });
    expect(s.ctas[0]?.label).toMatch(/3 proposed fixes/);
    expect(s.tone).toBe('attention');
  });

  it('drives pack build when profile is ready and no pack', () => {
    const s = buildCoachingHomeMonthSummary({
      ...base,
      profileReady: true,
      marketingHasPack: false,
    });
    expect(s.ctas[0]?.label).toBe('Build marketing pack');
  });

  it('surfaces next action when no pack blockers', () => {
    const s = buildCoachingHomeMonthSummary({
      ...base,
      profileReady: true,
      marketingHasPack: true,
      nextActionTitle: 'Review quote template',
      totalThisMonth: 2,
      completedThisMonth: 1,
    });
    expect(s.ctas[0]?.label).toBe('Open next action');
  });

  it('marks month clear when all monthly actions complete', () => {
    const s = buildCoachingHomeMonthSummary({
      ...base,
      profileReady: true,
      marketingHasPack: true,
      totalThisMonth: 4,
      completedThisMonth: 4,
    });
    expect(s.tone).toBe('good');
    expect(s.progress?.percent).toBe(100);
  });
});