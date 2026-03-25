/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and handles protected routes.
 */

import { NextResponse, type NextRequest } from 'next/server';

interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
}

/**
 * Verify JWT token via same-origin /api/auth/me (TypeScript, no Python).
 */
async function verifyToken(token: string, request: NextRequest): Promise<User | null> {
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
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
    user = await verifyToken(token, request);

    if (!user) {
      response.cookies.delete('auth_token');
    }
  }

  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectPath = request.nextUrl.pathname;
    if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      url.searchParams.set('redirect', redirectPath);
    }
    return NextResponse.redirect(url);
  }

  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    const redirect = request.nextUrl.searchParams.get('redirect');
    const safePath =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
    url.pathname = safePath;
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return response;
}
