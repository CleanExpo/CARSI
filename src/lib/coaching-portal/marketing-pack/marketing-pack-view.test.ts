import { describe, expect, it } from 'vitest';

import {
  checklistCompletionPercent,
  MARKETING_PACK_BUILD_STEPS,
  marketingPackJumpLinks,
  marketingPackStats,
} from './marketing-pack-view';

describe('marketingPackStats', () => {
  it('summarises fixes, checks, checklist and calendar for the stat grid', () => {
    const stats = marketingPackStats({
      review: {
        websiteUrl: 'https://x.test',
        googleBusinessUrl: null,
        siteReadable: true,
        summary: 's',
        checks: [
          { id: 'a', label: 'A', passed: true },
          { id: 'b', label: 'B', passed: false },
        ],
        fixes: [
          {
            id: 'f',
            rank: 1,
            area: 'website',
            title: 'T',
            why: 'w',
            how: 'h',
            impact: 3,
            effort: 1,
            score: 8,
          },
        ],
      },
      checklist: [
        { id: '1', label: 'L', detail: 'd', done: true },
        { id: '2', label: 'L2', detail: 'd2', done: false },
      ],
      calendar: {
        posts: [{ day: 1, date: '2026-01-01', theme: 't', caption: 'c', hashtags: [] }],
        source: 'template',
        rejectedCount: 0,
        tradeMatched: true,
      },
    });
    expect(stats.map((s) => s.id)).toEqual(['fixes', 'checks', 'checklist', 'social']);
    expect(stats[0].value).toBe('1');
    expect(stats[1].value).toBe('1/2');
    expect(stats[2].value).toBe('1/2');
    expect(stats[3].value).toBe('1');
  });
});

describe('checklistCompletionPercent', () => {
  it('returns 0 for an empty checklist', () => {
    expect(checklistCompletionPercent([])).toBe(0);
  });
});

describe('marketingPackJumpLinks', () => {
  it('includes checks when the review ran site checks', () => {
    expect(marketingPackJumpLinks(true).some((l) => l.id === 'mp-checks')).toBe(true);
    expect(marketingPackJumpLinks(false).some((l) => l.id === 'mp-checks')).toBe(false);
  });
});

describe('MARKETING_PACK_BUILD_STEPS', () => {
  it('lists four member-visible build phases', () => {
    expect(MARKETING_PACK_BUILD_STEPS).toHaveLength(4);
  });
});
