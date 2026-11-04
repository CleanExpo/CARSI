import type { NextRequest, NextResponse } from 'next/server';

import { isPageNavigation } from '@/lib/server/first-touch-capture';
import {
  newPurchaseSurveyCookieValue,
  PURCHASE_SURVEY_COOKIE_NAME,
  purchaseSurveyCookieOptions,
  purchaseSurveyKeyFromCookie,
} from '@/lib/server/purchase-survey-token';

/**
 * Adds the `carsi_svk` purchase-survey browser key to `response` on a page view when the browser
 * has no valid key yet (GP-662). Never replaces a valid key. Setting it before any checkout
 * starts means a browser's first checkouts, even two started at once in two tabs, all bind the
 * same key. The caller decides whether the feature is enabled.
 */
export function withPurchaseSurveyKeyCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!isPageNavigation(request)) return response;
  if (purchaseSurveyKeyFromCookie(request.cookies.get(PURCHASE_SURVEY_COOKIE_NAME)?.value)) return response;
  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
  response.cookies.set(PURCHASE_SURVEY_COOKIE_NAME, newPurchaseSurveyCookieValue(), purchaseSurveyCookieOptions(secure));
  // This response is personal to one visitor: no shared cache may store it with the cookie.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
