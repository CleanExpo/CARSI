import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { isLmsAdminNow } from '@/lib/server/current-admin';

/**
 * GP-760: the ONE check for "this verified LMS session is an admin right now", for every reader
 * that turns a session into admin or staff access (the admin panel, draft course files, the
 * checkout prerequisite exemption). The token's role only decides whether to ask: a token that does
 * not claim admin is refused without a database read. A token that does is accepted only when the
 * database says, now, that the user is active, the session generation is current and the effective
 * role is admin (isLmsAdminNow: one statement, no cache). A database error refuses (fails closed).
 */
export async function isLmsSessionAdminNow(claims: SessionClaims | null | undefined): Promise<boolean> {
  if (!claims || !isLmsClaimsAllowedAdminPanel(claims)) return false;
  try {
    return await isLmsAdminNow(prisma, claims.sub, claims.sg);
  } catch (e) {
    console.error(
      '[lms-admin-now] admin re-check failed; refusing:',
      e instanceof Error ? e.message : String(e)
    );
    return false;
  }
}
