import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const headerStore = vi.hoisted(() => ({ value: new Headers() }));

vi.mock('next/headers', () => ({
  headers: async () => headerStore.value,
}));

const { getServerOrigin } = await import('./request-origin');

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', '');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('VERCEL_BRANCH_URL', '');
  headerStore.value = new Headers({
    host: 'evil.example',
    'x-forwarded-host': 'evil.example',
    'x-forwarded-proto': 'https',
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('GP-700 getServerOrigin (credential pages)', () => {
  it('ignores a forged Host / X-Forwarded-Host and uses the canonical origin', async () => {
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });

  it('uses the configured address over a forged host', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.com.au/');
    expect(await getServerOrigin()).toBe('https://carsi.com.au');
  });
});
