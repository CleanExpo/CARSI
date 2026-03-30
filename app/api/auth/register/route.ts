import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { registerUserWithPassword } from '@/lib/server/lms-auth';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
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

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'Database not configured. Set DATABASE_URL.' },
        { status: 503 }
      );
    }

    const result = await registerUserWithPassword({ email, password, fullName });
    if (!result.ok) {
      if (result.code === 'EMAIL_TAKEN') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };
    response.cookies.set('auth_token', accessToken, { ...cookieOptions, httpOnly: true });
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: false });

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
