import { NextRequest } from 'next/server';

import { updateSession } from '@/lib/api/middleware';
import { isAttributionCaptureEnabled } from '@/lib/server/attribution-capture-flag';
import { withFirstTouchCookie } from '@/lib/server/first-touch-capture';
import { lookupCourseSlugInDatabase, renamedCourseRedirect } from '@/lib/seo/renamed-course-slugs';

export async function proxy(request: NextRequest) {
  const renamed = await renamedCourseRedirect(request, lookupCourseSlugInDatabase);
  const response = renamed ?? (await updateSession(request));
  // First-touch attribution (dark unless ATTRIBUTION_CAPTURE_ENABLED). Read per request, so it
  // also covers prerendered pages, whose render-time flag reads are frozen at build.
  return isAttributionCaptureEnabled() ? withFirstTouchCookie(request, response) : response;
}

export const config = {
  matcher: [
    /*
     * Run middleware on all application routes except static assets and API routes.
     * API auth is handled by dedicated route handlers.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)',
  ],
};
