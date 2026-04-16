import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { authenticateWithPassword } from '@/lib/server/lms-auth';
import { checkRateLimit } from '@/lib/server/rate-limit';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

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
      user: {
        id: claims.sub,
        email: claims.email,
        full_name: claims.full_name,
        role: claims.role,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };

    response.cookies.set('auth_token', access_token, cookieOptions);
    response.cookies.set('carsi_token', access_token, cookieOptions);

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
