import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { sendRegistrationWelcomeEmail } from '@/lib/server/auth-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { registerUserWithPassword } from '@/lib/server/lms-auth';
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
    const rl = applyRateLimit(`auth-register:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        },
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

    const origin = getAppOrigin(request);
    void sendRegistrationWelcomeEmail({
      to: claims.email,
      fullName: claims.full_name,
      dashboardUrl: `${origin}/dashboard/student`,
      appOrigin: origin,
    }).catch((e) => console.error('[register] welcome email', e));

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
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: true });

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
