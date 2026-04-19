import { NextRequest, NextResponse } from 'next/server';

import {
  CCW_COOKIE_MAX_AGE_SECONDS,
  CCW_COOKIE_NAME,
  constantTimeEqual,
  signCcwAccessToken,
} from '@/lib/ccw/access-token';

export const runtime = 'nodejs';

/** Unlock the CCW materials page with the shared workshop password. */
export async function POST(request: NextRequest) {
  const expected = process.env.CCW_ACCESS_PASSWORD?.trim();
  if (!expected) {
    console.error('[ccw-materials/auth] CCW_ACCESS_PASSWORD env var is not set');
    return NextResponse.json(
      { error: 'Materials access is not configured. Contact the workshop host.' },
      { status: 503 }
    );
  }

  let body: { password?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const submitted = typeof body.password === 'string' ? body.password : '';
  if (!submitted) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  // Always run the comparison even if submitted is empty, to keep timing flat.
  const ok = constantTimeEqual(submitted, expected);
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await signCcwAccessToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(CCW_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CCW_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/** Clear the CCW access cookie (sign out from the materials page). */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CCW_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
