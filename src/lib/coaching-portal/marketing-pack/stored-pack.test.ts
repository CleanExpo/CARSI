import { describe, expect, it } from 'vitest';

import { parseStoredMarketingPackRow } from '@/lib/coaching-portal/marketing-pack/stored-pack';

const baseRow = {
  id: 'pack-1',
  calendarSource: 'template',
  createdAt: new Date('2026-11-05T00:00:00.000Z'),
};

describe('parseStoredMarketingPackRow', () => {
  it('parses valid JSON fields', () => {
    const parsed = parseStoredMarketingPackRow({
      ...baseRow,
      reviewJson: JSON.stringify({ summary: 'ok', fixes: [], checks: [] }),
      checklistJson: JSON.stringify([]),
      calendarJson: JSON.stringify({ posts: [], source: 'template', rejectedCount: 0, tradeMatched: true }),
      voiceJson: JSON.stringify({ businessName: 'A', trade: 'T', town: 'X', services: '' }),
    });
    expect(parsed?.id).toBe('pack-1');
    expect(parsed?.review.summary).toBe('ok');
  });

  it('returns null on corrupt JSON', () => {
    expect(
      parseStoredMarketingPackRow({
        ...baseRow,
        reviewJson: '{',
        checklistJson: '[]',
        calendarJson: '[]',
        voiceJson: '{}',
      })
    ).toBeNull();
  });
});
