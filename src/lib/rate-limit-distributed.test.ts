import { describe, expect, it } from 'vitest';

import { applyRateLimitDistributed, isDistributedRateLimitConfigured } from './rate-limit-distributed';

// No Upstash env in the test environment, so these exercise the in-process
// fallback path (which must still enforce the limit and never throw).
describe('applyRateLimitDistributed (in-process fallback)', () => {
  it('reports not configured without Upstash env', () => {
    expect(isDistributedRateLimitConfigured()).toBe(false);
  });

  it('allows up to the limit then blocks', async () => {
    const key = `test-${Math.random().toString(36).slice(2)}`;
    const limit = 3;
    const windowMs = 60_000;

    for (let i = 0; i < limit; i += 1) {
      const r = await applyRateLimitDistributed(key, limit, windowMs);
      expect(r.ok).toBe(true);
    }

    const blocked = await applyRateLimitDistributed(key, limit, windowMs);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
