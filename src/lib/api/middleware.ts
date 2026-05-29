/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and handles protected routes.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/lib/admin/admin-constants';
import {
  getPostLoginRedirectPath,
  isLmsClaimsAllowedAdminPanel,
} from '@/lib/admin/admin-panel-access';
import { isValidAdminSessionCookie } from '@/lib/admin/admin-session-edge';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { internalToolsEnabled, isInternalToolPath } from '@/lib/internal-tools';

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
/** Legacy WordPress / marketing paths → dashboard student area. */
function legacyStudentRedirect(pathname: string): string | null {
  if (pathname === '/student') return '/dashboard/student';
  if (pathname.startsWith('/student/')) {
    return `/dashboard${pathname}`;
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const studentRedirect = legacyStudentRedirect(pathname);
  if (studentRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = studentRedirect;
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

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

  if (isAdminPath && user && !adminSessionValid) {
    const claims: SessionClaims = {
      sub: user.id,
      email: user.email,
      full_name: 'User',
      role: user.roles?.[0] ?? 'student',
    };
    if (!isLmsClaimsAllowedAdminPanel(claims)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard/student';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

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
    const claims: SessionClaims = {
      sub: user.id,
      email: user.email,
      full_name: 'User',
      role: user.roles?.[0] ?? 'student',
    };
    const next =
      request.nextUrl.searchParams.get('next') ?? request.nextUrl.searchParams.get('redirect');
    url.pathname = getPostLoginRedirectPath(claims, next);
    url.searchParams.delete('next');
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return response;
}
