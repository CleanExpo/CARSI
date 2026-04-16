import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { registerUserWithPassword } from '@/lib/server/lms-auth';
import { checkRateLimit } from '@/lib/server/rate-limit';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Database not configured. Set DATABASE_URL.' },
        { status: 503 }
      );
    }

    const result = await registerUserWithPassword({ email, password, fullName });
    if (!result.ok) {
      if (result.code === 'EMAIL_TAKEN') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    const { claims } = result;
    const accessToken = await signSessionToken(claims);

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
    response.cookies.set('auth_token', accessToken, cookieOptions);
    response.cookies.set('carsi_token', accessToken, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Registration service unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
