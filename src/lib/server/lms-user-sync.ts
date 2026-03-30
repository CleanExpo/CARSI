import { createHash } from 'node:crypto';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

/** Placeholder password for JWT-only accounts (auth is not verified against this row). */
function placeholderPassword(sub: string): string {
  return `jwt:${createHash('sha256').update(sub).digest('hex').slice(0, 40)}`;
}

export async function ensureLmsUserFromClaims(claims: SessionClaims): Promise<void> {
  await prisma.lmsUser.upsert({
    where: { id: claims.sub },
    create: {
      id: claims.sub,
      email: claims.email,
      fullName: claims.full_name,
      hashedPassword: placeholderPassword(claims.sub),
      isActive: true,
      isVerified: true,
    },
    update: {
      email: claims.email,
      fullName: claims.full_name,
    },
  });
}
