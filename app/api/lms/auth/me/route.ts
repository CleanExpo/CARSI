import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import type { User } from '@/lib/api/auth';

/**
 * LMS profile for apiClient.getCurrentUser — same JWT as /api/auth/login cookies.
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

  const user: User = {
    id: claims.sub,
    email: claims.email,
    full_name: claims.full_name,
    roles: [claims.role],
    theme_preference: 'dark',
    is_active: true,
    is_verified: true,
  };
  return NextResponse.json(user);
}
