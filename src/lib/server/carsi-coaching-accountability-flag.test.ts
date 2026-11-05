import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isCarsiCoachingAccountabilityEmailEnabled,
  isCarsiCoachingAccountabilityEnabled,
} from '@/lib/server/carsi-coaching-accountability-flag';

describe('GP-635 accountability flags', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('both are off when unset (the production default)', () => {
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', undefined);
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', undefined);
    expect(isCarsiCoachingAccountabilityEnabled()).toBe(false);
    expect(isCarsiCoachingAccountabilityEmailEnabled()).toBe(false);
  });

  it('stay off for anything other than exactly "true"', () => {
    for (const v of ['', 'false', '0', '1', 'TRUE', 'True', 'yes', ' true', 'true ']) {
      vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', v);
      vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', 'true');
      expect(isCarsiCoachingAccountabilityEnabled(), JSON.stringify(v)).toBe(false);
      expect(isCarsiCoachingAccountabilityEmailEnabled(), JSON.stringify(v)).toBe(false);
    }
  });

  it('e-mail sending needs its own flag as well as the feature flag', () => {
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', 'true');
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', '');
    expect(isCarsiCoachingAccountabilityEnabled()).toBe(true);
    expect(isCarsiCoachingAccountabilityEmailEnabled()).toBe(false);
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', 'true');
    expect(isCarsiCoachingAccountabilityEmailEnabled()).toBe(true);
  });
});
