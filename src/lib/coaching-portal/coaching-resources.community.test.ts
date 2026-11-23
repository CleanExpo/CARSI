import { describe, expect, it } from 'vitest';

import { COACHING_RESOURCE_SECTIONS } from '@/lib/coaching-portal/coaching-resources';

describe('coaching resources community (GP-561 A9 preview)', () => {
  it('includes TradeHall preview with anchor for deep links', () => {
    const community = COACHING_RESOURCE_SECTIONS.find((s) => s.id === 'community');
    expect(community?.anchorId).toBe('tradehall');
    expect(community?.items.some((i) => i.id === 'tradehall-preview')).toBe(true);
    expect(community?.items.some((i) => i.href.includes('owner-circle'))).toBe(true);
  });
});