import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  const clearOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('auth_token', '', { ...clearOptions, httpOnly: true });
  response.cookies.set('carsi_token', '', { ...clearOptions, httpOnly: false });

  return response;
}
