import { cookies } from 'next/headers';

import { verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

export async function getServerSessionClaims(): Promise<SessionClaims | null> {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
