import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../../next.config';
import { updateSession } from './api/middleware';

describe('public first-run aliases', () => {
  it('maps signup to the existing form and onboarding to public pathways', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects.filter(({ source }) => source === '/signup')).toEqual([
      { source: '/signup', destination: '/register', permanent: true },
    ]);
    expect(redirects.filter(({ source }) => source === '/onboarding')).toEqual([
      { source: '/onboarding', destination: '/pathways', permanent: false },
    ]);
    expect(redirects.some(({ source }) => source === '/register' || source === '/pathways')).toBe(false);
  });

  it.each([
    ['/signup', '/register', 308],
    ['/onboarding', '/pathways', 307],
  ] as const)('routes %s while preserving query parameters', async (from, to, status) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://carsi.com.au${from}?next=%2Fcourses%2Fintro-test&utm_source=legacy-link`,
      nextConfig,
    });
    expect(response.status).toBe(status);
    const destination = new URL(response.headers.get('location')!);
    expect(destination.pathname).toBe(to);
    expect(destination.searchParams.get('next')).toBe('/courses/intro-test');
    expect(destination.searchParams.get('utm_source')).toBe('legacy-link');
  });

  it.each(['/register', '/pathways'])(
    'keeps %s accessible without a learner account or an expired session',
    async (path) => {
      for (const cookie of ['', 'auth_token=expired-session']) {
        const response = await updateSession(
          new NextRequest(`https://carsi.com.au${path}`, { headers: { cookie } }),
        );
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-next')).toBe('1');
      }
    },
  );
});
