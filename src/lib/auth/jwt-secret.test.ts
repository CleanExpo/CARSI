import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAdminSecretBytes, getSessionSecretBytes, resolveJwtSecret } from './jwt-secret';

const STRONG = 'k'.repeat(40); // >= 32 chars

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('resolveJwtSecret', () => {
  it('returns a strong secret value even in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveJwtSecret({ value: STRONG, label: 'JWT_SECRET', devFallback: 'dev' })).toBe(STRONG);
  });

  it('throws in production when the secret is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() =>
      resolveJwtSecret({ value: undefined, label: 'JWT_SECRET', devFallback: 'dev' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('throws in production when the secret is shorter than 32 chars', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() =>
      resolveJwtSecret({ value: 'too-short', label: 'JWT_SECRET', devFallback: 'dev' }),
    ).toThrow();
  });

  it('falls back to the dev secret outside production when unset', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      resolveJwtSecret({ value: undefined, label: 'JWT_SECRET', devFallback: 'dev-fallback' }),
    ).toBe('dev-fallback');
  });
});

describe('getSessionSecretBytes', () => {
  it('encodes a strong JWT_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', STRONG);
    expect(getSessionSecretBytes()).toEqual(new TextEncoder().encode(STRONG));
  });

  it('throws in production when JWT_SECRET is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', undefined);
    expect(() => getSessionSecretBytes()).toThrow(/JWT_SECRET/);
  });
});

describe('getAdminSecretBytes', () => {
  it('falls back to JWT_SECRET when ADMIN_JWT_SECRET is unset', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_JWT_SECRET', undefined);
    vi.stubEnv('JWT_SECRET', STRONG);
    expect(getAdminSecretBytes()).toEqual(new TextEncoder().encode(STRONG));
  });

  it('throws in production when neither admin nor session secret is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_JWT_SECRET', undefined);
    vi.stubEnv('JWT_SECRET', undefined);
    expect(() => getAdminSecretBytes()).toThrow();
  });
});
