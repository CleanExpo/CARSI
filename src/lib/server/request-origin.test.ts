import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const headerMap = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => headerMap.get(name.toLowerCase()) ?? null }),
}));

import { getServerOrigin } from './request-origin';

beforeEach(() => {
  headerMap.clear();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('getServerOrigin (GP-756)', () => {
  it('uses the configured app URL, not a forged Host header', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.com.au/');
    headerMap.set('host', 'evil.example');
    headerMap.set('x-forwarded-proto', 'https');
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });

  it('uses the configured app URL over x-forwarded-host', async () => {
    vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', 'https://carsi.com.au');
    headerMap.set('x-forwarded-host', 'evil.example');
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });

  it('falls back to the request host when no app URL is configured', async () => {
    headerMap.set('x-forwarded-host', 'www.carsi.com.au');
    headerMap.set('x-forwarded-proto', 'https');
    expect(await getServerOrigin()).toBe('https://www.carsi.com.au');
  });

  it('never returns a local host in production', async () => {
    headerMap.set('host', 'localhost:3000');
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });

  it('defaults to the canonical site with no host and no env', async () => {
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });
});
