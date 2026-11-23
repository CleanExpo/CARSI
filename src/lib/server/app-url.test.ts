import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppOrigin, getCheckoutReturnUrl } from './app-url';

function requestWithOrigin(origin: string) {
  return { nextUrl: { origin } };
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('getAppOrigin', () => {
  it('uses public app URL env before request origin and frontend URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', ' https://example.com/ ');
    vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', 'https://frontend.example.com');
    expect(getAppOrigin(requestWithOrigin('https://localhost:8080'))).toBe('https://example.com');
  });

  it.each([
    'http://localhost:8080',
    'https://LOCALHOST:8080',
    'http://localhost.:8080',
    'http://preview.localhost:8080',
    'http://0.0.0.0:8080',
    'http://127.0.0.1:8080',
    'http://[::1]:8080',
    'http://[::]:8080',
  ])('does not leak local origin %s into production links from requests or env', (origin) => {
    expect(getAppOrigin(requestWithOrigin(origin))).toBe('https://carsi.com.au');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', origin);
    vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', origin);
    expect(getAppOrigin()).toBe('https://carsi.com.au');
  });

  it('uses frontend URL when app URL is absent or invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', 'https://frontend.example.com/');
    expect(getAppOrigin()).toBe('https://frontend.example.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:8080');
    expect(getAppOrigin()).toBe('https://frontend.example.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'not a URL');
    expect(getAppOrigin()).toBe('https://frontend.example.com');
  });

  it('GP-700: never takes a foreign request host in production', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('VERCEL_URL', '');
    vi.stubEnv('VERCEL_BRANCH_URL', '');
    for (const forged of [
      'https://evil.example',
      'https://carsi.com.au.evil.example',
      'http://carsi.com.au',
    ]) {
      expect(getAppOrigin(requestWithOrigin(forged))).toBe('https://carsi.com.au');
    }
  });

  it('GP-700: a configured address beats a forged request host', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.com.au');
    expect(getAppOrigin(requestWithOrigin('https://evil.example'))).toBe('https://carsi.com.au');
  });

  it('GP-700: never reads the request host in production, even a CARSI host', () => {
    vi.stubEnv('VERCEL_ENV', '');
    for (const origin of [
      'https://www.carsi.com.au',
      'https://carsi.com.au:8443',
      'https://www.carsi.com.au:8443',
    ]) {
      expect(getAppOrigin(requestWithOrigin(origin))).toBe('https://carsi.com.au');
    }
  });

  it('GP-700: a production deployment ignores the platform preview address', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_URL', 'carsi-abc123.vercel.app');
    expect(getAppOrigin(requestWithOrigin('https://evil.example'))).toBe('https://carsi.com.au');
  });

  it('GP-700: a preview deployment uses the platform-set address, not the request', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_BRANCH_URL', 'carsi-git-feature.vercel.app');
    expect(getAppOrigin(requestWithOrigin('https://evil.example'))).toBe(
      'https://carsi-git-feature.vercel.app'
    );
  });

  it('uses a non-local request origin in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getAppOrigin(requestWithOrigin('https://dev.example.com'))).toBe(
      'https://dev.example.com'
    );
  });

  it('still supports a configured localhost URL in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:8080/');
    expect(getAppOrigin()).toBe('http://localhost:8080');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(getAppOrigin()).toBe('http://localhost:3000');
  });
});

describe('getCheckoutReturnUrl', () => {
  const fallback = 'https://carsi.com.au/dashboard/courses';
  it.each([
    undefined,
    '',
    'not a URL',
    'https-invalid',
    'javascript:alert(1)',
    'ftp://example.com',
  ])('falls back for invalid URL %s', (value) => {
    expect(getCheckoutReturnUrl(value, fallback)).toBe(fallback);
  });

  it('allows local return URLs during development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const value = 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}';
    expect(getCheckoutReturnUrl(value, fallback)).toBe(value);
  });

  it('GP-700: keeps a return URL on the canonical origin, with the Stripe placeholder intact', () => {
    const value = 'https://carsi.com.au/dashboard/student?session_id={CHECKOUT_SESSION_ID}';
    expect(getCheckoutReturnUrl(value, fallback)).toBe(value);
  });

  it.each([
    'https://evil.example/paid',
    'https://carsi.com.au.evil.example/paid',
    'http://carsi.com.au/paid',
    'https://carsi.com.au:8443/paid',
    'https://www.carsi.com.au:8443/paid',
    'http://www.carsi.com.au/paid',
  ])('GP-700: a production return URL off the canonical origin falls back (%s)', (value) => {
    expect(getCheckoutReturnUrl(value, fallback)).toBe(fallback);
  });

  it("GP-700: keeps a return URL on CARSI's www host, where a www buyer's session cookie lives", () => {
    const value = 'https://www.carsi.com.au/dashboard/student?session_id={CHECKOUT_SESSION_ID}';
    expect(getCheckoutReturnUrl(value, fallback)).toBe(value);
  });
});
