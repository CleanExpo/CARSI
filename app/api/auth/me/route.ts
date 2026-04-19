import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

/**
 * Validates Bearer JWT for proxy.ts / middleware (starter template).
 * Merges display name and theme from Postgres when available.
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

  let full_name = claims.full_name;
  let theme_preference = 'dark';

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const row = await prisma.lmsUser.findUnique({
        where: { id: claims.sub },
        select: { fullName: true, themePreference: true },
      });
      if (row?.fullName?.trim()) full_name = row.fullName.trim();
      if (row?.themePreference) theme_preference = row.themePreference;
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    id: claims.sub,
    email: claims.email,
    full_name,
    roles: [claims.role],
    theme_preference,
    is_active: true,
    is_verified: true,
  });
}
