import { jwtVerify, SignJWT } from 'jose';

import type { SessionClaims } from '@/lib/auth/session-jwt';

export const ADMIN_COOKIE_NAME = 'admin_session';

const DEFAULT_ADMIN_EMAIL = 'mmlrana00@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Rana1199@';

/**
 * Server-side: read from env on each call so `.env` changes apply without stale module cache.
 * Trims whitespace / CRLF that often breaks exact password matches in `.env` files.
 */
export function getAdminEmail(): string {
  const v = process.env.ADMIN_EMAIL;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return DEFAULT_ADMIN_EMAIL;
}

export function getAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Emails that may open `/admin` after a normal LMS login (`auth_token`), in addition to users
 * whose JWT `role` is `admin`. Always includes `ADMIN_EMAIL`. Set `ADMIN_PANEL_EMAILS` to a
 * comma-separated list (e.g. `ops@example.com,support@example.com`).
 */
export function getAdminPanelAllowedEmails(): Set<string> {
  const out = new Set<string>();
  out.add(getAdminEmail().toLowerCase());
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

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ??
  // Fall back to the app JWT secret so this works out-of-the-box in dev.
  process.env.JWT_SECRET ??
  'dev-admin-jwt-secret-change-me';

function getSecretKeyBytes(): Uint8Array {
  return new TextEncoder().encode(ADMIN_JWT_SECRET);
}

export type AdminSessionClaims = {
  email: string;
};

export async function createAdminSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(getSecretKeyBytes());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKeyBytes());
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (sub !== 'admin') return null;
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!email) return null;
    // RA-3027 — accept any email present in the `admin_users` table OR
    // the legacy env-var email. The DB check is lazy-imported so this
    // module stays usable in contexts that don't have Prisma loaded.
    const emailLower = email.toLowerCase();
    if (emailLower === getAdminEmail().toLowerCase()) return { email };
    try {
      const { prisma } = await import('@/lib/prisma');
      const row = await prisma.adminUser.findUnique({
        where: { email: emailLower },
        select: { isActive: true },
      });
      if (row?.isActive) return { email };
    } catch {
      // DB unavailable — fall through to reject. Conservative on purpose
      // since we don't want stolen tokens to validate during a DB outage.
    }
    return null;
  } catch {
    return null;
  }
}

