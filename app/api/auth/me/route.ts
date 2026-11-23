import { NextRequest, NextResponse } from 'next/server';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { isCurrentGeneration } from '@/lib/auth/session-generation';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { readLmsUserNow } from '@/lib/server/lms-auth';

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
  // GP-760: the role shown, and the admin toggle, follow the database role now. Without a database
  // (local runs) the token's role is shown; with one, a failed read refuses the session.
  let role = claims.role;
  let can_access_admin = isLmsClaimsAllowedAdminPanel(claims);

  if (process.env.DATABASE_URL?.trim()) {
    can_access_admin = false;
    // GP-760 (fail closed): the session is reported only when the database confirms it now. An
    // unreadable database or an unknown user is not a session, the same rule as verifyActiveSession.
    let user: Awaited<ReturnType<typeof readLmsUserNow>>;
    try {
      user = await readLmsUserNow(prisma, claims.sub);
    } catch (e) {
      console.error('[auth/me] session re-check failed; refusing:', e instanceof Error ? e.message : String(e));
      return NextResponse.json({ detail: 'Session could not be verified' }, { status: 401 });
    }
    if (!user || !user.active) {
      return NextResponse.json({ detail: 'Account deactivated' }, { status: 401 });
    }
    // GP-760: a session from an earlier generation (ended by a password reset) is over.
    if (!isCurrentGeneration(claims.sg, user.generation)) {
      return NextResponse.json({ detail: 'Session ended' }, { status: 401 });
    }
    role = user.role;
    can_access_admin = user.role === 'admin';
    if (user.fullName?.trim()) full_name = user.fullName.trim();
    try {
      const row = await prisma.lmsUser.findUnique({
        where: { id: claims.sub },
        select: { themePreference: true, isActive: true, isVerified: true },
      });
      if (row?.themePreference) theme_preference = row.themePreference;
      if (row) {
        is_active = row.isActive;
        is_verified = row.isVerified;
      }
    } catch {
      /* display preferences only — the session itself was confirmed above */
    }
  }

  return NextResponse.json({
    id: claims.sub,
    email: claims.email,
    full_name,
    roles: [role],
    // True when this user may open the admin panel: their effective database role is `admin` now.
    // No email list grants it. The client uses this to show the admin/learner view toggle.
    can_access_admin,
    theme_preference,
    is_active,
    is_verified,
  });
}
