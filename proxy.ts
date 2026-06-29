import { NextRequest } from 'next/server';

import { updateSession } from '@/lib/api/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
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

