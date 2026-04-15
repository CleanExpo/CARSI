import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminEmail,
  getAdminPassword,
} from '@/lib/admin/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    const expectedEmail = getAdminEmail();
    const expectedPassword = getAdminPassword();

    if (
      email.toLowerCase() !== expectedEmail.toLowerCase() ||
      password !== expectedPassword
    ) {
      return NextResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createAdminSessionToken(email);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (_e) {
    return NextResponse.json({ detail: 'Admin login failed' }, { status: 500 });
  }
}

