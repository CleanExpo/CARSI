import { cookies } from 'next/headers';

import {
  ADMIN_COOKIE_NAME,
  isLmsClaimsAllowedAdminPanel,
  verifyAdminSessionToken,
  type AdminSessionClaims,
} from '@/lib/admin/admin-auth';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { isLmsAdminNow } from '@/lib/server/current-admin';

/**
 * Admin cookie (`/api/admin/login`) or a valid LMS JWT (`/api/auth/login`) whose user is an
 * admin NOW. No email list grants LMS admin.
 *
 * GP-760: the token's role claim only short-cuts a non-admin token. For an admin token the
 * database decides on every request (isLmsAdminNow: active now, session within the cut-off,
 * effective role 'admin' now), so a demotion or deactivation takes effect on the next request
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
    if (claims && isLmsClaimsAllowedAdminPanel(claims)) {
      try {
        if (await isLmsAdminNow(prisma, claims.sub, claims.iat)) return { email: claims.email };
      } catch (e) {
        console.error(
          '[admin-session] admin re-check failed; refusing:',
          e instanceof Error ? e.message : String(e)
        );
      }
    }
  }

  return null;
}
