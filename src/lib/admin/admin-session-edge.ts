import { jwtVerify } from 'jose';

import { getAdminSecretBytes } from '@/lib/auth/jwt-secret';

/** Edge-safe admin cookie check (JWT only — no Prisma). */
export async function isValidAdminSessionCookie(token: string | undefined): Promise<boolean> {
  if (!token?.trim()) return false;

  try {
    const { payload } = await jwtVerify(token, getAdminSecretBytes());
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    return sub === 'admin' && Boolean(email);
  } catch {
    return false;
  }
}
