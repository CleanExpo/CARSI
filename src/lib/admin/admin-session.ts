import { cookies } from 'next/headers';

import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
  type AdminSessionClaims,
} from '@/lib/admin/admin-auth';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { isLmsSessionAdminNow } from '@/lib/server/lms-admin-now';

/**
 * Admin cookie (`/api/admin/login`) or a valid LMS JWT (`/api/auth/login`) whose user is an
 * admin NOW. No email list grants LMS admin.
 *
 * GP-760: the token's role claim only short-cuts a non-admin token. For an admin token the
 * database decides on every request (isLmsSessionAdminNow: active now, current session
 * generation, effective role 'admin' now), so a demotion or deactivation takes effect on the next request
 * rather than when the 7-day token expires. A database failure refuses admin access (fail closed),
 * as verifyAdminSessionToken does for the admin cookie.
 */
export async function getAdminSessionOrNull(): Promise<AdminSessionClaims | null> {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    const fromCookie = await verifyAdminSessionToken(adminToken);
    if (fromCookie) return fromCookie;
  }

  const lmsToken =
    cookieStore.get('auth_token')?.value ?? cookieStore.get('carsi_token')?.value;
  if (lmsToken) {
    const claims = await verifySessionToken(lmsToken);
    if (claims && (await isLmsSessionAdminNow(claims))) return { email: claims.email };
  }

  return null;
}
