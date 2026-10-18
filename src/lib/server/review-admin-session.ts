import type { NextRequest } from 'next/server';

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin/admin-auth';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import type { AdminSessionProvenance } from '@/lib/server/current-admin';

/**
 * The ONE session reader for every review-admin route (release-gate r8, r10): the admin cookie
 * (the legacy admin-password login) first, as getAdminSessionOrNull does, else the LMS session
 * (Bearer token or auth cookies, with its active-account check) — KEEPING which mechanism verified
 * it. resolveCurrentAdmin grants the bootstrap and admin_users kinds only to the admin cookie, and
 * an LMS session only by its user's current database role. There is no role or allow-list filter
 * here: that decision belongs to resolveCurrentAdmin, against the database, inside the action.
 */
export async function readReviewAdminSession(
  request: NextRequest
): Promise<AdminSessionProvenance | null> {
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    const fromCookie = await verifyAdminSessionToken(adminToken);
    if (fromCookie) return { via: 'admin_cookie', email: fromCookie.email };
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (claims?.sub) return { via: 'lms_session', userId: claims.sub, email: claims.email };

  return null;
}
