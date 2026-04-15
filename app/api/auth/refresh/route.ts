import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken, verifySessionToken } from '@/lib/auth/session-jwt';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const currentToken = request.cookies.get('auth_token')?.value;
  if (!currentToken) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 });
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };

  const claims = await verifySessionToken(currentToken);
  if (!claims) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const refreshed = await signSessionToken({
    sub: claims.sub,
    email: claims.email,
    full_name: claims.full_name,
    role: claims.role,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', refreshed, cookieOptions);
  response.cookies.set('carsi_token', refreshed, cookieOptions);
  return response;
}
