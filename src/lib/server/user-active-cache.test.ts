import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cutoffSeconds, issuedWithinCutoff } from '@/lib/auth/session-cutoff';

import {
  ACTIVE_TTL_MS,
  __clearActiveCache,
  resolveSessionState,
  sessionMatchesState,
  type UserSessionState,
} from './user-active-cache';

beforeEach(() => __clearActiveCache());

const ACTIVE: UserSessionState = { active: true, role: 'student', validAfterSec: null };
const INACTIVE: UserSessionState = { active: false, role: 'student', validAfterSec: null };

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

describe('issuedWithinCutoff (GP-760)', () => {
  it('accepts any session when there is no cut-off', () => {
    expect(issuedWithinCutoff(1, null)).toBe(true);
  });

  it('accepts a session issued in or after the cut-off second, refuses an earlier one', () => {
    const cutoff = cutoffSeconds(BigInt(1_800_000_000));
    expect(cutoff).toBe(1_800_000_000);
    expect(cutoffSeconds('1800000000')).toBe(1_800_000_000);
    expect(cutoffSeconds(null)).toBeNull();
    expect(issuedWithinCutoff(1_800_000_000, cutoff)).toBe(true);
    expect(issuedWithinCutoff(1_800_000_001, cutoff)).toBe(true);
    expect(issuedWithinCutoff(1_799_999_999, cutoff)).toBe(false);
  });

  it('treats a token with no iat as issued at 0', () => {
    expect(issuedWithinCutoff(undefined, 1)).toBe(false);
  });
});

describe('sessionMatchesState (GP-760)', () => {
  const claims = (role: string, iat = 1_800_000_000) => ({
    sub: 'u',
    email: 'u@example.test',
    full_name: 'U',
    role,
    iat,
  });

  it('accepts an active user whose token role is the current role', () => {
    expect(sessionMatchesState(claims('admin'), { ...ACTIVE, role: 'admin' })).toBe(true);
  });

  it('refuses a token whose role is no longer the database role (demotion)', () => {
    expect(sessionMatchesState(claims('admin'), { ...ACTIVE, role: 'student' })).toBe(false);
  });

  it('refuses an inactive user and a session before the cut-off', () => {
    expect(sessionMatchesState(claims('student'), INACTIVE)).toBe(false);
    expect(
      sessionMatchesState(claims('student', 99), { ...ACTIVE, validAfterSec: 100 })
    ).toBe(false);
  });
});
