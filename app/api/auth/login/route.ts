import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const externalBackend =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || process.env.BACKEND_URL?.trim();

    if (externalBackend) {
      const backendResponse = await fetch(
        `${externalBackend.replace(/\/$/, '')}/api/lms/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return NextResponse.json(
          { error: data.detail || 'Invalid credentials' },
          { status: backendResponse.status }
        );
      }

      const response = NextResponse.json({
        success: true,
        user: {
          id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
        },
      });

      const cookieOptions = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      };

      response.cookies.set('auth_token', data.access_token, {
        ...cookieOptions,
        httpOnly: true,
      });

      response.cookies.set('carsi_token', data.access_token, {
        ...cookieOptions,
        httpOnly: false,
      });

      return response;
    }

    const demoEmail = process.env.AUTH_EMAIL || 'admin@local.dev';
    const demoPassword = process.env.AUTH_PASSWORD || 'admin123';
    const demoName = process.env.AUTH_FULL_NAME || 'Admin User';
    const demoRole = process.env.AUTH_ROLE || 'admin';

    if (email !== demoEmail || password !== demoPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const userId = process.env.AUTH_USER_ID || '00000000-0000-0000-0000-000000000001';
    const access_token = await signSessionToken({
      sub: userId,
      email: demoEmail,
      full_name: demoName,
      role: demoRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: demoEmail,
        full_name: demoName,
        role: demoRole,
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
