import { jwtVerify, SignJWT } from 'jose';

export { ADMIN_COOKIE_NAME } from '@/lib/admin/admin-constants';
export {
  getAdminEmail,
  getAdminPanelAllowedEmails,
  getDefaultAppPathForClaims,
  getPostLoginRedirectPath,
  isLmsClaimsAllowedAdminPanel,
} from '@/lib/admin/admin-panel-access';

import { getAdminEmail } from '@/lib/admin/admin-panel-access';

const DEFAULT_ADMIN_PASSWORD = 'Rana1199@';

export function getAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return DEFAULT_ADMIN_PASSWORD;
}

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ??
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
      // DB unavailable — conservative reject.
    }
    return null;
  } catch {
    return null;
  }
}
