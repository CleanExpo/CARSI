import { NextRequest, NextResponse } from 'next/server';

import { ONBOARDING_COOKIE } from '@/lib/auth/onboarding-cookie';

function clearSessionCookies(response: NextResponse) {
  const clearOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('auth_token', '', { ...clearOptions, httpOnly: true });
  response.cookies.set('carsi_token', '', { ...clearOptions, httpOnly: true });
  response.cookies.set(ONBOARDING_COOKIE, '', { ...clearOptions, httpOnly: true });

  return response;
}

export async function GET(request: NextRequest) {
  return clearSessionCookies(NextResponse.redirect(new URL('/login', request.url), { status: 303 }));
}

export async function POST(request: NextRequest) {
  const acceptsHtml = request.headers.get('accept')?.includes('text/html') ?? false;
  const response = acceptsHtml
    ? NextResponse.redirect(new URL('/login', request.url), { status: 303 })
    : NextResponse.json({ success: true });

  return clearSessionCookies(response);
}
