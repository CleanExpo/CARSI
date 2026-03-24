import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';

/**
 * Validates Bearer JWT for proxy.ts / middleware (starter template).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.slice(7);
  const claims = await verifySessionToken(token);
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }
  return NextResponse.json({
    id: claims.sub,
    email: claims.email,
    is_active: true,
    is_admin: claims.role === 'admin',
  });
}
