import { NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/api/middleware';
import {
  CATALOG_PUBLISHED_SLUGS,
  cachedCourseSlugLookup,
  courseAssetDecision,
  hasStaffSession,
} from '@/lib/courses/course-asset-access';
import { isAttributionCaptureEnabled } from '@/lib/server/attribution-capture-flag';
import { withFirstTouchCookie } from '@/lib/server/first-touch-capture';
import { withPartnerRefCookie } from '@/lib/server/partner-referral-cookie';
import { lookupCourseSlugInDatabase, renamedCourseRedirect } from '@/lib/seo/renamed-course-slugs';

/** Course publication state for course files. Only closed answers are cached (see the module). */
const courseFileLookup = cachedCourseSlugLookup(lookupCourseSlugInDatabase);

export async function proxy(request: NextRequest) {
  // GP-730: files under public/courses/<folder>/ are public only for a published course (the same
  // database rule as the course page). A draft's field tools and diagrams are served to staff
  // only; everyone else gets the same 404 as an address that never existed.
  const courseAsset = await courseAssetDecision(request.nextUrl.pathname, {
    lookup: courseFileLookup,
    isStaff: () => hasStaffSession(request.cookies),
    // The seed answers only where no database exists (local runs, CI). With a database
    // configured, a failed lookup refuses rather than trusting the seed.
    seedWhenNoDatabase: process.env.DATABASE_URL?.trim() ? undefined : CATALOG_PUBLISHED_SLUGS,
  });
  if (courseAsset === 'refuse') {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // Staff reviewing a draft: never let a shared cache keep the file for the next visitor.
  if (courseAsset === 'serve-private') {
    return NextResponse.next({
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    });
  }
  // A published course's file is served as before, with no session or attribution work: static
  // files never ran the proxy until the course-file matcher below was added.
  if (courseAsset === 'serve') return NextResponse.next();

  const renamed = await renamedCourseRedirect(request, lookupCourseSlugInDatabase);
  // GP-767: a partner link (`?ref=ccw`) records the partner for 30 days. Always on: it credits a
  // partner for a sale, and an unknown ref does nothing.
  const response = withPartnerRefCookie(request, renamed ?? (await updateSession(request)));
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
     * proxy serves them publicly only for a published course. `:path+` with no fixed folder
     * segment so `/courses/<folder>%2F<file>` (one raw segment, decoded to a real file by the
     * static server) still reaches the proxy and is refused.
     */
    '/courses/:path+',
  ],
};
