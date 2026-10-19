import type { SessionClaims } from '@/lib/auth/session-jwt';

/** Server-side admin bootstrap email from env (no Prisma — safe for Edge middleware). */
export function getAdminEmail(): string {
  const v = process.env.ADMIN_EMAIL;
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Staff addresses that unverified account creation must REFUSE. This list grants nothing:
 * LMS admin comes only from the database role (founder decision 19/10/2026 — see
 * `isLmsClaimsAllowedAdminPanel`). Public self-registration, guest signup, Stripe-email
 * provisioning and provisional claims do not verify inbox ownership, so a stranger could
 * otherwise create an account under a founder/support address before its owner does
 * (PR #907). `FOUNDER_EMAILS` covers founder accounts when no env is set; `ADMIN_EMAIL`
 * and `ADMIN_PANEL_EMAILS` (comma-separated) add to it. Keep lowercase.
 */
const FOUNDER_EMAILS = ['phill.m@carsi.com.au'] as const;

export function getReservedStaffEmails(): Set<string> {
  const out = new Set<string>(FOUNDER_EMAILS);
  const bootstrap = getAdminEmail().toLowerCase();
  if (bootstrap) out.add(bootstrap);
  const raw = process.env.ADMIN_PANEL_EMAILS;
  if (typeof raw === 'string' && raw.trim()) {
    for (const part of raw.split(',')) {
      const e = part.trim().toLowerCase();
      if (e) out.add(e);
    }
  }
  return out;
}

/** True for a staff address that unverified account creation must refuse. Grants no access. */
export function isReservedStaffEmail(email: string): boolean {
  return getReservedStaffEmails().has(email.trim().toLowerCase());
}

/**
 * LMS admin: the session role, which `resolveSessionRole` mints from the database
 * (lms_user_roles, then lms_users.role) at sign-in. Never an email list, env var or constant.
 */
export function isLmsClaimsAllowedAdminPanel(claims: SessionClaims): boolean {
  return claims.role.trim().toLowerCase() === 'admin';
}

/** Default landing after sign-in: admin panel for LMS admins, student overview otherwise. */
export function getDefaultAppPathForClaims(claims: SessionClaims): '/admin' | '/dashboard/student' {
  return isLmsClaimsAllowedAdminPanel(claims) ? '/admin' : '/dashboard/student';
}

/**
 * Honors `next` when safe; blocks `/admin` for users who are not LMS admins.
 */
export function getPostLoginRedirectPath(
  claims: SessionClaims,
  requestedNext?: string | null
): string {
  const defaultPath = getDefaultAppPathForClaims(claims);
  const next = requestedNext?.trim();
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return defaultPath;
  }
  if (next.startsWith('/admin') && !isLmsClaimsAllowedAdminPanel(claims)) {
    return '/dashboard/student';
  }
  return next;
}
