import { afterEach, describe, expect, it, vi } from 'vitest';

import { findMissingRequiredEnv, validateRequiredEnv } from './boot-env';

/**
 * WS2 (P0-B) AC-5 — fail-loud boot env validation.
 *
 * Mirrors resolveJwtSecret's posture: in production a missing required var THROWS
 * so a mis-provisioned deploy (the original Margot 504 root cause) crashes fast
 * and visibly instead of booting a silently-broken instance; outside production
 * it only warns. Pure + DI (env passed in) so tests never mutate process.env.
 */

const FULL_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://user:pw@host:5432/db',
  STRIPE_SECRET_KEY: 'sk_live_abc123',
  OPENROUTER_API_KEY: 'sk-or-abc123',
  JWT_SECRET: 'x'.repeat(32),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findMissingRequiredEnv', () => {
  it('returns [] when all required vars are present and valid', () => {
    expect(findMissingRequiredEnv(FULL_ENV)).toEqual([]);
  });

  it('flags a missing DATABASE_URL', () => {
    expect(findMissingRequiredEnv({ ...FULL_ENV, DATABASE_URL: '' })).toContain('DATABASE_URL');
  });

  it('flags a missing STRIPE_SECRET_KEY', () => {
    expect(findMissingRequiredEnv({ ...FULL_ENV, STRIPE_SECRET_KEY: undefined })).toContain(
      'STRIPE_SECRET_KEY',
    );
  });

  it('flags a missing OPENROUTER_API_KEY (the AI provider of record)', () => {
    expect(findMissingRequiredEnv({ ...FULL_ENV, OPENROUTER_API_KEY: '   ' })).toContain(
      'OPENROUTER_API_KEY',
    );
  });

  it('flags a too-short JWT_SECRET', () => {
    expect(findMissingRequiredEnv({ ...FULL_ENV, JWT_SECRET: 'short' }).join(',')).toMatch(
      /JWT_SECRET/,
    );
  });

  it('reports EVERY missing var at once (so the operator fixes them in one redeploy)', () => {
    // The whole operational point of AC-5: a fully unprovisioned env lists all
    // four, not just the first — a regression to first-miss-only must fail here.
    expect(findMissingRequiredEnv({ NODE_ENV: 'production' })).toEqual([
      'DATABASE_URL',
      'STRIPE_SECRET_KEY',
      'OPENROUTER_API_KEY',
      'JWT_SECRET (min 32 chars)',
    ]);
  });
});

describe('validateRequiredEnv', () => {
  it('throws in production when the AI key is missing', () => {
    expect(() =>
      validateRequiredEnv({ ...FULL_ENV, OPENROUTER_API_KEY: undefined }),
    ).toThrow(/OPENROUTER_API_KEY/);
  });

  it('throws in production when STRIPE_SECRET_KEY is missing', () => {
    expect(() => validateRequiredEnv({ ...FULL_ENV, STRIPE_SECRET_KEY: '' })).toThrow(
      /STRIPE_SECRET_KEY/,
    );
  });

  it('throws in production when DATABASE_URL is missing', () => {
    expect(() => validateRequiredEnv({ ...FULL_ENV, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('does not throw in production when everything is present', () => {
    expect(() => validateRequiredEnv(FULL_ENV)).not.toThrow();
  });

  it('names every missing var in the single thrown message', () => {
    expect(() => validateRequiredEnv({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL.*STRIPE_SECRET_KEY.*OPENROUTER_API_KEY.*JWT_SECRET/s,
    );
  });

  it('does not throw outside production, only warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      validateRequiredEnv({ NODE_ENV: 'development' }),
    ).not.toThrow();
    expect(() => validateRequiredEnv({ NODE_ENV: 'test' })).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
