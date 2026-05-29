import type { SessionClaims } from '@/lib/auth/session-jwt';

/** Server-side admin bootstrap email from env (no Prisma — safe for Edge middleware). */
export function getAdminEmail(): string {
  const v = process.env.ADMIN_EMAIL;
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Emails that may open `/admin` after LMS login, in addition to JWT role `admin`.
 * Set `ADMIN_PANEL_EMAILS` to a comma-separated list (e.g. `support@carsi.com.au`).
 */
export function getAdminPanelAllowedEmails(): Set<string> {
  const out = new Set<string>();
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
