import { describe, expect, it } from 'vitest';

import { matchSignIn, type MatchableSignIn } from './match';

/**
 * AC#15(a) — match precedence (email → business → name) and the load-bearing
 * invariant: only a UNIQUE email-exact match may auto-tick; every business/name
 * match is ambiguous and must be surfaced for an admin, never auto-applied.
 */
const pool: MatchableSignIn[] = [
  { id: 'a', normalizedEmail: 'ann@x.com', normalizedBusiness: 'acme cleaning', normalizedName: 'ann jones' },
  { id: 'b', normalizedEmail: 'bob@x.com', normalizedBusiness: 'acme cleaning', normalizedName: 'bob jones' },
  { id: 'c', normalizedEmail: 'cal@x.com', normalizedBusiness: 'zed pty', normalizedName: 'ann jones' },
];

describe('matchSignIn precedence', () => {
  it('unique email-exact match auto-ticks', () => {
    const r = matchSignIn({ email: 'ANN@x.com' }, pool);
    expect(r.via).toBe('email');
    expect(r.matches).toEqual(['a']);
    expect(r.autoTick).toBe(true);
  });

  it('email is preferred over a business/name that would also match', () => {
    const r = matchSignIn({ email: 'bob@x.com', businessName: 'Acme Cleaning', fullName: 'Ann Jones' }, pool);
    expect(r.via).toBe('email');
    expect(r.matches).toEqual(['b']);
  });

  it('business-exact match is AMBIGUOUS — surfaced, never auto-ticked', () => {
    const r = matchSignIn({ email: 'new@x.com', businessName: 'Acme Cleaning' }, pool);
    expect(r.via).toBe('business');
    expect(r.matches.sort()).toEqual(['a', 'b']);
    expect(r.autoTick).toBe(false);
  });

  it('falls back to name-exact when no email/business match — still ambiguous', () => {
    const r = matchSignIn({ email: 'new@x.com', fullName: 'Ann Jones' }, pool);
    expect(r.via).toBe('name');
    expect(r.matches.sort()).toEqual(['a', 'c']);
    expect(r.autoTick).toBe(false);
  });

  it('multiple email hits (data fault) never auto-tick', () => {
    const dupPool: MatchableSignIn[] = [
      { id: 'x', normalizedEmail: 'dup@x.com', normalizedBusiness: null, normalizedName: 'x' },
      { id: 'y', normalizedEmail: 'dup@x.com', normalizedBusiness: null, normalizedName: 'y' },
    ];
    const r = matchSignIn({ email: 'dup@x.com' }, dupPool);
    expect(r.via).toBe('email');
    expect(r.autoTick).toBe(false);
  });

  it('no match returns none', () => {
    expect(matchSignIn({ email: 'nobody@x.com' }, pool)).toEqual({ via: 'none', matches: [], autoTick: false });
  });
});
