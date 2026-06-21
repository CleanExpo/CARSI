import { NextRequest, NextResponse } from 'next/server';

import { getPostLoginRedirectPath } from '@/lib/admin/admin-auth';
import { signSessionToken } from '@/lib/auth/session-jwt';
import { authenticateWithPassword } from '@/lib/server/lms-auth';
import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const AUTH_LIMIT = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFrom(
      request.headers.get('x-forwarded-for'),
      request.headers.get('x-real-ip'),
    );
    const rl = applyRateLimit(`auth-login:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        },
      );
    }

    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      next?: unknown;
      redirect?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const requestedNext =
      (typeof body.next === 'string' ? body.next : null) ??
      (typeof body.redirect === 'string' ? body.redirect : null);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Database not configured. Set DATABASE_URL.' },
        { status: 503 }
      );
    }

    const claims = await authenticateWithPassword(email, password);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const access_token = await signSessionToken(claims);

    const response = NextResponse.json({
      success: true,
      redirect_to: getPostLoginRedirectPath(claims, requestedNext),
      user: {
        id: claims.sub,
        email: claims.email,
        full_name: claims.full_name,
        role: claims.role,
      },
    });

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };

    response.cookies.set('auth_token', access_token, {
      ...cookieOptions,
      httpOnly: true,
    });

    response.cookies.set('carsi_token', access_token, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error('[auth/login] failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Login service unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
