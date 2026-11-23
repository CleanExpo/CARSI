import { describe, expect, it } from 'vitest';

import { generationClaim, isCurrentGeneration } from '@/lib/auth/session-generation';

import { sessionMatchesState, type UserSessionState } from './user-active-cache';

// GP-760 review of f512fd90: the per-instance cache and the learner fail-open path are gone; the
// database is read on every request and a failed read refuses. Those behaviours are now covered
// end to end in session-freshness-authoritative.test.ts.

const ACTIVE: UserSessionState = { active: true, role: 'student', generation: 0 };
const INACTIVE: UserSessionState = { active: false, role: 'student', generation: 0 };

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
