import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';

/**
 * Validates Bearer JWT for proxy.ts / middleware (starter template).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = request.cookies.get('auth_token')?.value;
  const token = bearer || cookieToken;
  if (!token) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const claims = await verifySessionToken(token);
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json({
    id: claims.sub,
    email: claims.email,
    full_name: claims.full_name,
    roles: [claims.role],
    theme_preference: 'dark',
    is_active: true,
    is_verified: true,
  });
}
