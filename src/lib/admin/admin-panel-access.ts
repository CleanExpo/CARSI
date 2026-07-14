import type { SessionClaims } from '@/lib/auth/session-jwt';

/** Server-side admin bootstrap email from env (no Prisma — safe for Edge middleware). */
export function getAdminEmail(): string {
  const v = process.env.ADMIN_EMAIL;
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Founder admin account(s) that ALWAYS reach the admin panel, independent of env
 * config — an env-drift guard so admin access can't be silently lost when
 * `ADMIN_PANEL_EMAILS` is unset in a deploy (which is exactly what hid the
 * admin⇄learner view toggle from phill.m@carsi.com.au).
 *
 * SECURITY — read before editing this list. `isLmsClaimsAllowedAdminPanel` trusts the
 * self-asserted `claims.email`, and public self-registration (POST /api/auth/register)
 * does NOT verify email ownership. So an address listed here that is NOT already a
 * claimed `LmsUser` could be self-registered by anyone to gain full admin. Only list
 * emails backed by a real, already-registered password account (its row blocks
 * re-registration via EMAIL_TAKEN). `phill.m@carsi.com.au` is such an account.
 * Do NOT add the `ADMIN_EMAIL` / `support@` bootstrap address — that is the separate
 * legacy admin-password login, likely has no LmsUser row, and hardcoding it would open
 * a self-registration account-takeover. Keep lowercase.
 */
const FOUNDER_ADMIN_EMAILS = ['phill.m@carsi.com.au'] as const;

/**
 * Emails that may open `/admin` after LMS login, in addition to JWT role `admin`.
 * Always includes the founder accounts above; `ADMIN_PANEL_EMAILS` (comma-separated,
 * e.g. `support@carsi.com.au`) and the `ADMIN_EMAIL` bootstrap add to it.
 */
export function getAdminPanelAllowedEmails(): Set<string> {
  const out = new Set<string>(FOUNDER_ADMIN_EMAILS);
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

/** LMS session may access the admin dashboard if role is admin or email is allowlisted. */
export function isLmsClaimsAllowedAdminPanel(claims: SessionClaims): boolean {
  if (claims.role.trim().toLowerCase() === 'admin') return true;
  return getAdminPanelAllowedEmails().has(claims.email.trim().toLowerCase());
}

/** Default landing after sign-in: admin panel for allowlisted emails, student overview otherwise. */
export function getDefaultAppPathForClaims(claims: SessionClaims): '/admin' | '/dashboard/student' {
  return isLmsClaimsAllowedAdminPanel(claims) ? '/admin' : '/dashboard/student';
}

/**
 * Honors `next` when safe; blocks `/admin` for users not on the admin allowlist.
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
