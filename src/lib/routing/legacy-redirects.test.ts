import { describe, expect, it } from 'vitest';

// Next's own runtime matcher pieces, assembled the way
// next/dist/server/lib/router-utils/filesystem.js builds redirect routes, so this test
// checks what the server would match rather than a re-implementation.
import { getRedirectStatus, modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';

import nextConfig from '../../../next.config';

type Redirect = { source: string; destination: string; permanent?: boolean; statusCode?: number };

async function resolveRedirect(pathname: string) {
  const routes = ((await nextConfig.redirects?.()) ?? []) as Redirect[];
  for (const route of routes) {
    const match = getPathMatch(route.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex) => modifyRouteRegex(regex, ['/_next']),
      sensitive: false, // next.config sets no experimental.caseSensitiveRoutes
    });
    if (match(pathname) !== false) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { destination: route.destination, statusCode: getRedirectStatus(route as any) };
    }
  }
  return null;
}

/**
 * IICRC's public online-CEC listing links learners to carsi.com.au/restoration-courses,
 * which returned 404 (observed 17/09/2026). Every click-through must land on /courses.
 */
describe('legacy /restoration-courses redirect', () => {
  it.each([
    '/restoration-courses',
    '/restoration-courses/water-damage',
    '/restoration-courses/a/b/c',
    '/RESTORATION-COURSES',
  ])('%s permanently redirects (308) to /courses', async (pathname) => {
    expect(await resolveRedirect(pathname)).toEqual({ destination: '/courses', statusCode: 308 });
  });

  it('does not capture unrelated paths', async () => {
    expect(await resolveRedirect('/courses')).toBeNull();
    expect(await resolveRedirect('/restoration-courses-extra')).toBeNull();
    expect(await resolveRedirect('/restoration-training-cost-australia')).toBeNull();
  });

  it('keeps the existing legacy /student redirect', async () => {
    expect(await resolveRedirect('/student/abc')).toEqual({
      destination: '/dashboard/student/:path*',
      statusCode: 308,
    });
  });
});
