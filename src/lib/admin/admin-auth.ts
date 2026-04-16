import { jwtVerify, SignJWT } from 'jose';

import type { SessionClaims } from '@/lib/auth/session-jwt';

export const ADMIN_COOKIE_NAME = 'admin_session';

// DEFAULT_ADMIN_PASSWORD intentionally removed — ADMIN_PASSWORD must be set in env.
// A missing env var returns '' (empty), causing all login attempts to fail safely.

/**
 * Server-side: read from env on each call so `.env` changes apply without stale module cache.
 * Trims whitespace / CRLF that often breaks exact password matches in `.env` files.
 */
export function getAdminEmail(): string {
  const v = process.env.ADMIN_EMAIL;
  if (typeof v === 'string' && v.trim()) return v.trim();
  throw new Error('ADMIN_EMAIL environment variable is required');
}

export function getAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD;
  if (typeof v === 'string' && v.trim()) return v.trim();
  // No hardcoded fallback — return '' so login always fails when env var is unset.
  // Set ADMIN_PASSWORD in your deployment environment (Railway / Vercel env vars).
  return '';
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

/**
 * Login form prefill (client + server). Non-`NEXT_PUBLIC_` env vars are not available in the
 * browser bundle, so we also support optional `NEXT_PUBLIC_ADMIN_EMAIL` for a matching hint.
 */
export const ADMIN_EMAIL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim()) ||
  (typeof process !== 'undefined' && process.env.ADMIN_EMAIL?.trim()) ||
  '';

const _ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET;
if (!_ADMIN_JWT_SECRET) throw new Error('ADMIN_JWT_SECRET environment variable is required');
const ADMIN_JWT_SECRET = _ADMIN_JWT_SECRET;

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
    if (email.toLowerCase() !== getAdminEmail().toLowerCase()) return null;
    return { email };
  } catch {
    return null;
  }
}
