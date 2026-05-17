/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and handles protected routes.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/lib/admin/admin-constants';
import { isValidAdminSessionCookie } from '@/lib/admin/admin-session-edge';
import { internalToolsEnabled, isInternalToolPath } from '@/lib/internal-tools';
import { verifySessionToken } from '@/lib/auth/session-jwt';

interface User {
  id: string;
  email: string;
  roles?: string[];
  is_active?: boolean;
}

/**
 * Verify JWT in Edge middleware without a same-origin fetch. On DigitalOcean and other hosts,
 * internal fetch from middleware to `/api/auth/me` often fails or returns 401, which incorrectly
 * sent users back to `/login?next=...` after a successful login.
 */
async function verifyToken(token: string): Promise<User | null> {
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email,
    roles: [claims.role],
    is_active: true,
  };
}

/**
 * Update session and handle authentication
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const token = request.cookies.get('auth_token')?.value;

  let user: User | null = null;
  if (token) {
    user = await verifyToken(token);

    if (!user) {
      response.cookies.delete('auth_token');
      response.cookies.delete('carsi_token');
    }
  }

  /** Public credential verify — no login required (Phase 1). */
  function isPublicCredentialVerifyPath(pathname: string): boolean {
    return (
      /^\/dashboard\/credentials\/[^/]+(\/?)$/.test(pathname) ||
      /^\/verify\/credential\/[^/]+(\/?)$/.test(pathname)
    );
  }

  const pathname = request.nextUrl.pathname;

  if (isInternalToolPath(pathname) && !internalToolsEnabled()) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const isAdminPath = pathname.startsWith('/admin');

  const adminSessionValid =
    isAdminPath &&
    (await isValidAdminSessionCookie(request.cookies.get(ADMIN_COOKIE_NAME)?.value));

  const protectedPaths = ['/dashboard', '/student', '/instructor'];
  const isProtectedPath =
    protectedPaths.some((path) => pathname.startsWith(path)) ||
    (isAdminPath && !adminSessionValid && !user);

  if (isProtectedPath && !user && !isPublicCredentialVerifyPath(pathname)) {
    if (isAdminPath) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectPath = pathname;
    if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      url.searchParams.set('next', redirectPath);
    }
    return NextResponse.redirect(url);
  }

  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    const next =
      request.nextUrl.searchParams.get('next') ?? request.nextUrl.searchParams.get('redirect');
    const safePath =
      next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/student';
    url.pathname = safePath;
    url.searchParams.delete('next');
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return response;
}
