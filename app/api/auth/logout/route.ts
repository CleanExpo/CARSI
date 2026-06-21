import { NextResponse } from 'next/server';

import { ONBOARDING_COOKIE } from '@/lib/auth/onboarding-cookie';

export async function POST() {
  const response = NextResponse.json({ success: true });

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
