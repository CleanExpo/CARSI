import { jwtVerify } from 'jose';

/** Edge-safe admin cookie check (JWT only — no Prisma). */
export async function isValidAdminSessionCookie(token: string | undefined): Promise<boolean> {
  if (!token?.trim()) return false;

  const secret =
    process.env.ADMIN_JWT_SECRET ??
    process.env.JWT_SECRET ??
    'dev-admin-jwt-secret-change-me';

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    return sub === 'admin' && Boolean(email);
  } catch {
    return false;
  }
}
