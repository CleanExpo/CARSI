import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIVE_TTL_MS, __clearActiveCache, resolveActive } from './user-active-cache';

beforeEach(() => __clearActiveCache());

describe('resolveActive', () => {
  it('returns the fetched value and caches it', async () => {
    const fetcher = vi.fn(async () => true);
    expect(await resolveActive('u1', 1000, fetcher)).toBe(true);
    // within TTL → served from cache, fetcher not called again
    expect(await resolveActive('u1', 1000 + ACTIVE_TTL_MS - 1, fetcher)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL expires', async () => {
    const fetcher = vi.fn(async () => true);
    await resolveActive('u2', 0, fetcher);
    await resolveActive('u2', ACTIVE_TTL_MS + 1, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns false for a deactivated user', async () => {
    expect(await resolveActive('u3', 0, async () => false)).toBe(false);
  });

  it('fails OPEN on DB error and does NOT cache the fallback', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(false);
    // first call: error → fail open (true), not cached
    expect(await resolveActive('u4', 0, fetcher)).toBe(true);
    // second call: fetcher runs again (not cached) → real value
    expect(await resolveActive('u4', 10, fetcher)).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
