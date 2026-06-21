import { jwtVerify, SignJWT } from 'jose';

import { getAdminSecretBytes } from '@/lib/auth/jwt-secret';

export { ADMIN_COOKIE_NAME } from '@/lib/admin/admin-constants';
export {
  getAdminEmail,
  getAdminPanelAllowedEmails,
  getDefaultAppPathForClaims,
  getPostLoginRedirectPath,
  isLmsClaimsAllowedAdminPanel,
} from '@/lib/admin/admin-panel-access';

import { getAdminEmail } from '@/lib/admin/admin-panel-access';

export function getAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD;
  return typeof v === 'string' ? v.trim() : '';
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
    .sign(getAdminSecretBytes());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminSecretBytes());
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (sub !== 'admin') return null;
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!email) return null;
    const emailLower = email.toLowerCase();
    const bootstrapEmail = getAdminEmail().toLowerCase();
    if (bootstrapEmail && emailLower === bootstrapEmail) return { email };
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
