import { afterEach, describe, expect, it, vi } from 'vitest';

import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';

describe('CARSI_COACHING_ASSISTANT_ENABLED', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off when unset (the production default)', () => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', undefined);
    expect(isCarsiCoachingAssistantEnabled()).toBe(false);
  });

  it('stays off for anything other than exactly "true"', () => {
    for (const v of ['', 'false', '0', '1', 'TRUE', 'True', 'yes', ' true', 'true ']) {
      vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', v);
      expect(isCarsiCoachingAssistantEnabled(), JSON.stringify(v)).toBe(false);
    }
  });

  it('is on only for exactly "true"', () => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', 'true');
    expect(isCarsiCoachingAssistantEnabled()).toBe(true);
  });
});
