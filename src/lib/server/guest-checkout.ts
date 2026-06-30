import { randomBytes, randomUUID } from 'node:crypto';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { hashPassword, registerUserWithPassword, sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

/** Random password for Stripe-only guests until they set one on payment-success. */
export function generateProvisionalPassword(): string {
  return randomBytes(24).toString('base64url');
}

export async function findOrCreateGuestUser(params: {
  email: string;
  fullName: string;
  password?: string;
}): Promise<{ claims: SessionClaims; created: boolean }> {
  const email = params.email.trim().toLowerCase();
  // Never derive a name from the email — an email-prefix is not a usable name
  // and poisons certificates (#302). Empty means "no name on file".
  const fullName = params.fullName.trim();

  const existing = await prisma.lmsUser.findUnique({ where: { email } });
  if (existing) {
    if (params.password) {
      const hashed = await hashPassword(params.password);
      await prisma.lmsUser.update({
        where: { id: existing.id },
        data: { hashedPassword: hashed, fullName: fullName || existing.fullName },
      });
    }
    const claims = await sessionClaimsForUserId(existing.id);
    if (!claims) throw new Error('USER_INACTIVE');
    return { claims, created: false };
  }

  const password = params.password?.trim() || generateProvisionalPassword();
  const result = await registerUserWithPassword({ email, password, fullName });
  if (!result.ok) {
    if (result.code === 'EMAIL_TAKEN') {
      const claims = await sessionClaimsForUserId(
        (await prisma.lmsUser.findUnique({ where: { email } }))!.id,
      );
      if (!claims) throw new Error('USER_INACTIVE');
      return { claims, created: false };
    }
    throw new Error('REGISTER_FAILED');
  }

  return { claims: result.claims, created: true };
}

export async function ensureGuestUserFromStripeEmail(
  email: string,
  fullName?: string,
): Promise<SessionClaims | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const existing = await prisma.lmsUser.findUnique({ where: { email: normalized } });
  if (existing) {
    return sessionClaimsForUserId(existing.id);
  }

  const id = randomUUID();
  const hashedPassword = await hashPassword(generateProvisionalPassword());
  try {
    await prisma.lmsUser.create({
      data: {
        id,
        email: normalized,
        hashedPassword,
        // No email-derived name — store null when unknown (#302).
        fullName: fullName?.trim() || null,
        isActive: true,
        isVerified: false,
      },
    });
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    ) {
      const again = await prisma.lmsUser.findUnique({ where: { email: normalized } });
      if (again) return sessionClaimsForUserId(again.id);
    }
    throw e;
  }

  return sessionClaimsForUserId(id);
}
