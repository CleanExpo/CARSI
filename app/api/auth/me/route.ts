import { NextRequest, NextResponse } from 'next/server';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
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
  // Reflect the REAL account state from the DB rather than hardcoding it, and
  // reject a deactivated account (the 7-day JWT alone no longer grants access).
  let is_active = true;
  let is_verified = false;

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const row = await prisma.lmsUser.findUnique({
        where: { id: claims.sub },
        select: { fullName: true, themePreference: true, isActive: true, isVerified: true },
      });
      if (row && !row.isActive) {
        return NextResponse.json({ detail: 'Account deactivated' }, { status: 401 });
      }
      if (row?.fullName?.trim()) full_name = row.fullName.trim();
      if (row?.themePreference) theme_preference = row.themePreference;
      if (row) {
        is_active = row.isActive;
        is_verified = row.isVerified;
      }
    } catch {
      /* ignore — fall back to token-only response */
    }
  }

  return NextResponse.json({
    id: claims.sub,
    email: claims.email,
    full_name,
    roles: [claims.role],
    // True when this session may open the admin panel — either JWT role `admin`
    // or an email on the ADMIN_PANEL_EMAILS allowlist (e.g. support@carsi.com.au).
    // The client uses this to decide whether to show the admin/learner view toggle.
    can_access_admin: isLmsClaimsAllowedAdminPanel(claims),
    theme_preference,
    is_active,
    is_verified,
  });
}
