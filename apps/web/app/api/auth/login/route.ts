import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').trim();
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Forward credentials to the LMS auth backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/lms/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || 'Invalid credentials' },
        { status: backendResponse.status }
      );
    }

    // Backend returns: { access_token, user_id, email, full_name, role }
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

    // httpOnly cookie — backend middleware validates this
    response.cookies.set('auth_token', data.access_token, {
      ...cookieOptions,
      httpOnly: true,
    });

    // Non-httpOnly cookie — frontend apiClient reads this to set Bearer header
    response.cookies.set('carsi_token', data.access_token, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error('[auth/login] Backend request failed:', {
      backendUrl: BACKEND_URL,
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
