import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/api/middleware';

/**
 * CARSI LMS protected route prefixes.
 * Users without a session cookie (carsi_token or auth_token) are redirected to /login.
 * Public marketing, course catalog, and /subscribe stay open; checkout flows send users to login in-app.
 */
const PROTECTED_PREFIXES = [
  '/student',
  '/instructor',
  '/admin',
  // '/subscribe' is public — login only when user starts Stripe checkout (see subscribe page)
  // '/courses' intentionally NOT protected — catalog must be public for SEO
  // Individual lesson/quiz pages check enrolment via API calls
  '/dashboard', // hide starter template from unauthenticated users
  '/tasks',
  '/agents',
];

/** Either cookie counts — same JWT on login; avoids loops if one cookie is missing client-side */
function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('carsi_token')?.value || request.cookies.get('auth_token')?.value
  );
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CARSI LMS auth — redirect unauthenticated users to login
  if (isProtected(pathname)) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Starter template session handling (verifies JWT with backend)
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
