import { cookies } from 'next/headers';

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin/admin-auth';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import type { AdminSessionProvenance } from '@/lib/server/current-admin';

/**
 * The same cookies getAdminSessionOrNull reads, in the same order, but KEEPING which mechanism
 * verified the session (release-gate r8): resolveCurrentAdmin grants the bootstrap and admin_users
 * kinds only to the admin cookie, and an LMS session only by its user's current database role.
 * No allow-list filter here — that decision belongs to resolveCurrentAdmin, against the database.
 */
export async function readReviewAdminSession(): Promise<AdminSessionProvenance | null> {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    const fromCookie = await verifyAdminSessionToken(adminToken);
    if (fromCookie) return { via: 'admin_cookie', email: fromCookie.email };
  }

  const lmsToken = cookieStore.get('auth_token')?.value ?? cookieStore.get('carsi_token')?.value;
  if (lmsToken) {
    const claims = await verifySessionToken(lmsToken);
    if (claims?.sub) return { via: 'lms_session', userId: claims.sub, email: claims.email };
  }

  return null;
}
