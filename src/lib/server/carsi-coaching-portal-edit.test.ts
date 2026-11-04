import { afterEach, describe, expect, it, vi } from 'vitest';

import { isCoachingPortalDevUnlock } from '@/lib/server/carsi-coaching-portal-edit';

describe('CARSI_COACHING_PORTAL_DEV_UNLOCK', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is always off in production even when env is true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CARSI_COACHING_PORTAL_DEV_UNLOCK', 'true');
    expect(isCoachingPortalDevUnlock()).toBe(false);
  });

  it('is on in development only when exactly true', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CARSI_COACHING_PORTAL_DEV_UNLOCK', 'true');
    expect(isCoachingPortalDevUnlock()).toBe(true);
  });
});
