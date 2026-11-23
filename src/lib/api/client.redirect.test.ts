// @vitest-environment jsdom
/**
 * GP-745 — a 401 after a failed token refresh sends an LMS page to /login on the same origin
 * (a full-page navigation) and throws "Session expired"; a public page is not redirected.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './client';

const realLocation = window.location;
let navigatedTo: string | null;

function stubLocation(pathname: string) {
  navigatedTo = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'https://carsi.example',
      pathname,
      get href() {
        return `https://carsi.example${pathname}`;
      },
      set href(next: string) {
        navigatedTo = next;
      },
    },
  });
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).includes('/api/auth/refresh')
        ? new Response(null, { status: 401 })
        : new Response(JSON.stringify({ detail: 'no' }), { status: 401 })
    )
  );
});
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  vi.unstubAllGlobals();
});

describe('GP-745 401 session-expiry redirect', () => {
  it('navigates an LMS page to /login on the same origin and throws', async () => {
    stubLocation('/dashboard/student');
    await expect(apiClient.get('/api/lms/me')).rejects.toThrow('Session expired');
    expect(navigatedTo).not.toBeNull();
    const dest = new URL(navigatedTo as string);
    expect(dest.origin).toBe('https://carsi.example');
    expect(dest.pathname).toBe('/login');
  });

  it('does not navigate a public page', async () => {
    stubLocation('/courses/water-damage-restoration-fundamentals');
    await expect(apiClient.get('/api/lms/me')).rejects.toThrow('Session expired');
    expect(navigatedTo).toBeNull();
  });
});
