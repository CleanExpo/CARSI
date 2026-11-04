import { NextRequest } from 'next/server';

import { updateSession } from '@/lib/api/middleware';
import { isAttributionCaptureEnabled } from '@/lib/server/attribution-capture-flag';
import { withFirstTouchCookie } from '@/lib/server/first-touch-capture';
import { withPurchaseSurveyKeyCookie } from '@/lib/server/purchase-survey-key-capture';
import { isPurchaseSurveyEnabled } from '@/lib/server/purchase-survey-flag';
import { lookupCourseSlugInDatabase, renamedCourseRedirect } from '@/lib/seo/renamed-course-slugs';

export async function proxy(request: NextRequest) {
  const renamed = await renamedCourseRedirect(request, lookupCourseSlugInDatabase);
  const response = renamed ?? (await updateSession(request));
  // First-touch attribution (dark unless ATTRIBUTION_CAPTURE_ENABLED) and the purchase-survey
  // browser key (dark unless PURCHASE_SURVEY_ENABLED). Flags are read per request, so they also
  // cover prerendered pages, whose render-time flag reads are frozen at build.
  const withFirstTouch = isAttributionCaptureEnabled() ? withFirstTouchCookie(request, response) : response;
  return isPurchaseSurveyEnabled() ? withPurchaseSurveyKeyCookie(request, withFirstTouch) : withFirstTouch;
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
