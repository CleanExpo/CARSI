import { describe, expect, it } from 'vitest';

import { packProgressDelta, summarizeMarketingPack } from './pack-summary';
import type { MarketingPack } from './types';

const minimalPack = (overrides: Partial<MarketingPack['review']> = {}): MarketingPack => ({
  review: {
    websiteUrl: null,
    googleBusinessUrl: null,
    siteReadable: false,
    summary: 'Summary',
    checks: [
      { id: 'a', label: 'A', passed: true },
      { id: 'b', label: 'B', passed: false },
    ],
    fixes: [{ id: 'f', rank: 1, area: 'website', title: 'T', why: 'w', how: 'h', impact: 2, effort: 1, score: 5 }],
    ...overrides,
  },
  checklist: [],
  calendar: { posts: [], source: 'template', rejectedCount: 0, tradeMatched: true },
  voice: { businessName: '', trade: 'plumbing', town: '', services: '' },
  generatedAt: '2026-11-01T00:00:00.000Z',
});

describe('summarizeMarketingPack', () => {
  it('counts checks and fixes', () => {
    const s = summarizeMarketingPack('id-1', minimalPack());
    expect(s.checksPassed).toBe(1);
    expect(s.checksTotal).toBe(2);
    expect(s.fixCount).toBe(1);
  });
});

describe('packProgressDelta', () => {
  it('returns null deltas without a previous pack', () => {
    const cur = summarizeMarketingPack('a', minimalPack());
    expect(packProgressDelta(cur, null)).toEqual({ checksDelta: null, fixCountDelta: null });
  });

  it('computes check delta between packs', () => {
    const prev = summarizeMarketingPack('a', minimalPack());
    const cur = summarizeMarketingPack(
      'b',
      minimalPack({
        checks: [
          { id: 'a', label: 'A', passed: true },
          { id: 'b', label: 'B', passed: true },
        ],
      })
    );
    expect(packProgressDelta(cur, prev).checksDelta).toBe(1);
  });
});
