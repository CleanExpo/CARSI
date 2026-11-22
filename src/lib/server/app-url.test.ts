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

  it('uses non-local request origin when no env URL is set', () => {
    expect(getAppOrigin(requestWithOrigin('https://preview.example.com'))).toBe(
      'https://preview.example.com'
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
});
