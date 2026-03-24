import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/api/middleware';

/**
 * CARSI LMS protected route prefixes.
 * Users without a valid carsi_token cookie are redirected to /login.
 */
const PROTECTED_PREFIXES = [
  '/student',
  '/instructor',
  '/admin',
  '/subscribe',
  // '/courses' intentionally NOT protected — catalog must be public for SEO
  // Individual lesson/quiz pages check enrolment via API calls
  '/dashboard', // hide starter template from unauthenticated users
  '/tasks',
  '/agents',
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CARSI LMS auth — redirect unauthenticated users to login
  if (isProtected(pathname)) {
    const token = request.cookies.get('carsi_token');
    if (!token?.value) {
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
