import { cookies } from 'next/headers';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { verifyActiveSession } from '@/lib/server/user-active-cache';

export async function getServerSessionClaims(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get('auth_token')?.value ?? jar.get('carsi_token')?.value;
  if (!token) return null;
  return verifyActiveSession(token);
}
