import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import type { SessionClaims } from '@/lib/auth/session-jwt';

/** Local/dev only — allows saving coaching portal forms without a Stripe coaching row. */
export function isCoachingPortalDevUnlock(): boolean {
  return process.env.CARSI_COACHING_PORTAL_DEV_UNLOCK === 'true';
}

export function coachingPortalCanEdit(claims: SessionClaims, entitled: boolean): boolean {
  if (entitled) return true;
  if (isLmsClaimsAllowedAdminPanel(claims)) return true;
  if (isCoachingPortalDevUnlock()) return true;
  return false;
}
