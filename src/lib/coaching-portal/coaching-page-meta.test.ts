import { describe, expect, it } from 'vitest';

import { COACHING_PAGE_META } from './coaching-page-meta';

describe('COACHING_PAGE_META', () => {
  it('defines support copy for every primary workspace screen', () => {
    for (const key of [
      'plan',
      'actions',
      'sessions',
      'resources',
      'billing',
      'services',
      'marketing',
    ] as const) {
      const m = COACHING_PAGE_META[key];
      expect(m.title.length).toBeGreaterThan(2);
      expect(m.supportTips.length).toBeGreaterThan(0);
    }
  });
});
