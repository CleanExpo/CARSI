import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generationClaim, isCurrentGeneration } from '@/lib/auth/session-generation';

import {
  ACTIVE_TTL_MS,
  __clearActiveCache,
  resolveSessionState,
  sessionMatchesState,
  type UserSessionState,
} from './user-active-cache';

beforeEach(() => __clearActiveCache());

const ACTIVE: UserSessionState = { active: true, role: 'student', generation: 0 };
const INACTIVE: UserSessionState = { active: false, role: 'student', generation: 0 };

describe('resolveSessionState', () => {
  it('returns the fetched value and caches it', async () => {
    const fetcher = vi.fn(async () => ACTIVE);
    expect(await resolveSessionState('u1', 1000, fetcher)).toEqual(ACTIVE);
    // within TTL → served from cache, fetcher not called again
    expect(await resolveSessionState('u1', 1000 + ACTIVE_TTL_MS - 1, fetcher)).toEqual(ACTIVE);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL expires', async () => {
    const fetcher = vi.fn(async () => ACTIVE);
    await resolveSessionState('u2', 0, fetcher);
    await resolveSessionState('u2', ACTIVE_TTL_MS + 1, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns the state of a deactivated user', async () => {
    expect(await resolveSessionState('u3', 0, async () => INACTIVE)).toEqual(INACTIVE);
  });

  it('fails OPEN on DB error (null) and does NOT cache the fallback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(INACTIVE);
    // first call: error → fail open (null), not cached
    expect(await resolveSessionState('u4', 0, fetcher)).toBeNull();
    // second call: fetcher runs again (not cached) → real value
    expect(await resolveSessionState('u4', 10, fetcher)).toEqual(INACTIVE);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('session generation (GP-760)', () => {
  it('accepts only the current generation', () => {
    expect(isCurrentGeneration(0, 0)).toBe(true);
    expect(isCurrentGeneration(3, 3)).toBe(true);
    expect(isCurrentGeneration(2, 3)).toBe(false);
    expect(isCurrentGeneration(4, 3)).toBe(false);
  });

  it('treats a token with no generation claim as generation 0', () => {
    expect(isCurrentGeneration(undefined, 0)).toBe(true);
    expect(isCurrentGeneration(undefined, 1)).toBe(false);
  });

  it('reads only a non-negative integer claim', () => {
    expect(generationClaim(2)).toBe(2);
    expect(generationClaim('2')).toBe(0);
    expect(generationClaim(-1)).toBe(0);
    expect(generationClaim(1.5)).toBe(0);
    expect(generationClaim(undefined)).toBe(0);
  });
});

describe('sessionMatchesState (GP-760)', () => {
  const claims = (role: string, sg = 0) => ({
    sub: 'u',
    email: 'u@example.test',
    full_name: 'U',
    role,
    sg,
  });

  it('accepts an active user whose token role is the current role', () => {
    expect(sessionMatchesState(claims('admin'), { ...ACTIVE, role: 'admin' })).toBe(true);
  });

  it('refuses a token whose role is no longer the database role (demotion)', () => {
    expect(sessionMatchesState(claims('admin'), { ...ACTIVE, role: 'student' })).toBe(false);
  });

  it('refuses an inactive user and a session from an earlier generation', () => {
    expect(sessionMatchesState(claims('student'), INACTIVE)).toBe(false);
    expect(sessionMatchesState(claims('student', 0), { ...ACTIVE, generation: 1 })).toBe(false);
  });
});
