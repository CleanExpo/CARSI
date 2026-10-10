import { cookies } from 'next/headers';

import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';
import { isLmsUserActive } from '@/lib/server/user-active-cache';

async function verifyActiveSession(token: string): Promise<SessionClaims | null> {
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  if (!(await isLmsUserActive(claims.sub))) return null;
  return claims;
}

export async function getServerSessionClaims(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get('auth_token')?.value ?? jar.get('carsi_token')?.value;
  if (!token) return null;
  return verifyActiveSession(token);
}
