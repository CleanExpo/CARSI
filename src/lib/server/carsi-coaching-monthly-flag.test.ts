import { afterEach, describe, expect, it, vi } from 'vitest';

import { isCarsiCoachingMonthlyEnabled } from '@/lib/server/carsi-coaching-monthly-flag';

describe('CARSI_COACHING_MONTHLY_ENABLED', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to on when unset (checkout visible until explicitly disabled)', () => {
    vi.stubEnv('CARSI_COACHING_MONTHLY_ENABLED', undefined);
    expect(isCarsiCoachingMonthlyEnabled()).toBe(true);
  });

  it('turns off for explicit false-like values', () => {
    for (const v of ['false', '0', 'no', 'off', 'FALSE']) {
      vi.stubEnv('CARSI_COACHING_MONTHLY_ENABLED', v);
      expect(isCarsiCoachingMonthlyEnabled(), JSON.stringify(v)).toBe(false);
    }
  });

  it('stays on for true-like values other than explicit off', () => {
    for (const v of ['true', '1', 'yes', '']) {
      vi.stubEnv('CARSI_COACHING_MONTHLY_ENABLED', v);
      expect(isCarsiCoachingMonthlyEnabled(), JSON.stringify(v)).toBe(true);
    }
  });
});
