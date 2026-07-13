import { randomBytes, randomUUID } from 'node:crypto';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import {
  hashPassword,
  isProvisionalPasswordHash,
  provisionalPasswordHash,
  registerUserWithPassword,
  sessionClaimsForUserId,
} from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

/** Random password for Stripe-only guests until they set one on payment-success. */
export function generateProvisionalPassword(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Result of a guest enrol/checkout account resolution.
 * - `created`  — a brand-new account was created and authenticated.
 * - `claimed`  — an *unclaimed provisional* account was claimed (password set) and authenticated.
 * - `exists`   — the email belongs to an *established* account; NOTHING was mutated and NO session
 *               is granted. The caller must ask the user to sign in. This is the guard that closes
 *               the unauthenticated account-takeover (P0-A): an existing account's password is never
 *               overwritten, and no session is ever minted for it from an anonymous request.
 */
export type GuestUserOutcome =
  | { status: 'created'; claims: SessionClaims }
  | { status: 'claimed'; claims: SessionClaims }
  | { status: 'exists' };

type ExistingGuestUser = {
  id: string;
  hashedPassword: string;
  fullName: string | null;
  isActive: boolean;
};

/**
 * Decide what to do with an email that already maps to a row. An *unclaimed
 * provisional* account (never had a human-set password) may be claimed — but only
 * when `allowClaim` is set, which happens exclusively on the Stripe-verified
 * guest-complete path. Every other case (an established account, or any
 * unauthenticated guest-free request) returns `exists` and mutates nothing.
 */
async function resolveExistingGuestUser(
  user: ExistingGuestUser,
  opts: { fullName: string; password?: string; allowClaim: boolean },
): Promise<GuestUserOutcome> {
  const claimable = user.isActive && isProvisionalPasswordHash(user.hashedPassword);
  if (opts.allowClaim && claimable && opts.password) {
    const hashedPassword = await hashPassword(opts.password);
    await prisma.lmsUser.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        fullName: opts.fullName || user.fullName,
        isVerified: true,
      },
    });
    const claims = await sessionClaimsForUserId(user.id);
    if (claims) return { status: 'claimed', claims };
  }
  return { status: 'exists' };
}

export async function findOrCreateGuestUser(params: {
  email: string;
  fullName: string;
  password?: string;
  /**
   * Enables *claiming* an unclaimed provisional account (setting its password and
   * returning a session). Pass `true` ONLY on the Stripe-verified guest-complete
   * path — NEVER on the unauthenticated guest-free path, where an existing email
   * must never be mutated or authenticated.
   */
  allowClaim?: boolean;
}): Promise<GuestUserOutcome> {
  const email = params.email.trim().toLowerCase();
  // Never derive a name from the email — an email-prefix is not a usable name
  // and poisons certificates (#302). Empty means "no name on file".
  const fullName = params.fullName.trim();
  const allowClaim = params.allowClaim === true;

  const existing = await prisma.lmsUser.findUnique({ where: { email } });
  if (existing) {
    return resolveExistingGuestUser(existing, {
      fullName,
      password: params.password,
      allowClaim,
    });
  }

  const password = params.password?.trim() || generateProvisionalPassword();
  const result = await registerUserWithPassword({ email, password, fullName });
  if (result.ok) {
    return { status: 'created', claims: result.claims };
  }

  // Lost a create race — a row appeared concurrently. Re-resolve against it
  // rather than blindly overwriting; an established account still yields `exists`.
  const now = await prisma.lmsUser.findUnique({ where: { email } });
  if (now) {
    return resolveExistingGuestUser(now, { fullName, password: params.password, allowClaim });
  }
  throw new Error('REGISTER_FAILED');
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
  // Unclaimed provisional marker — never a real bcrypt hash. The account cannot
  // authenticate by password until the rightful payer claims it via guest-complete
  // (or resets their password); this keeps the row safely claimable without ever
  // storing an attacker-supplied or guessable secret.
  const hashedPassword = provisionalPasswordHash();
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
