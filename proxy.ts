import { NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/api/middleware';
import { courseAssetDecision } from '@/lib/courses/course-asset-access';
import { isAttributionCaptureEnabled } from '@/lib/server/attribution-capture-flag';
import { withFirstTouchCookie } from '@/lib/server/first-touch-capture';
import { lookupCourseSlugInDatabase, renamedCourseRedirect } from '@/lib/seo/renamed-course-slugs';

export async function proxy(request: NextRequest) {
  // GP-730: files under public/courses/<folder>/ are served only for a course the catalogue marks
  // as published. A draft's field tools and diagrams get the same 404 as an address that never
  // existed, so the response does not confirm that the file is there.
  const courseAsset = courseAssetDecision(request.nextUrl.pathname);
  if (courseAsset === 'refuse') {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // A published course's file is served as before, with no session or attribution work: static
  // files never ran the proxy until the course-file matcher below was added.
  if (courseAsset === 'serve') return NextResponse.next();

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
    /*
     * GP-730: course files under public/courses/<folder>/ (field tools, diagrams, packs). The
     * pattern above skips every path with a file extension, so these need their own entry; the
     * proxy serves them only for a published course.
     */
    '/courses/:folder/:path+',
  ],
};
