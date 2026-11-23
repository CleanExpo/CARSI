import { describe, expect, it } from 'vitest';

import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { buildTradeHallPassport } from '@/lib/coaching-portal/trade-hall-passport';

describe('TradeHall passport (GP-636 preview)', () => {
  it('builds a stable preview passport for a chapter member', () => {
    const p = buildTradeHallPassport({
      memberDisplayName: 'Jordan Demo',
      coach: DEFAULT_COACHING_COACH,
      subscriptionStartedAt: new Date('2026-10-01T00:00:00Z'),
    });
    expect(p.status).toBe('preview');
    expect(p.passportId).toContain('TH-');
    expect(p.chapterSlug).toBe(DEFAULT_COACHING_COACH.chapterSlug);
  });
});