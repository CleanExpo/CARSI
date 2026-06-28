import { afterEach, describe, expect, it } from 'vitest';

import { getAppOrigin } from './app-url';

function requestWithOrigin(origin: string) {
  return { nextUrl: { origin } } as Parameters<typeof getAppOrigin>[0];
}

describe('getAppOrigin', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
    if (originalFrontendUrl === undefined) {
      delete process.env.NEXT_PUBLIC_FRONTEND_URL;
    } else {
      process.env.NEXT_PUBLIC_FRONTEND_URL = originalFrontendUrl;
    }
  });

  it('uses public app URL env before request origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';

    expect(getAppOrigin(requestWithOrigin('https://localhost:8080'))).toBe('https://example.com');
  });

  it('does not leak localhost origins into production links', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_FRONTEND_URL;
    process.env.NODE_ENV = 'production';

    expect(getAppOrigin(requestWithOrigin('https://localhost:8080'))).toBe('https://carsi.com.au');
  });

  it('uses non-local request origin when no env URL is set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_FRONTEND_URL;

    expect(getAppOrigin(requestWithOrigin('https://preview.example.com'))).toBe(
      'https://preview.example.com',
    );
  });
});
