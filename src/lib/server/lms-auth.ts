import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';

import { isReservedStaffEmail } from '@/lib/admin/admin-panel-access';
import { isCurrentGeneration } from '@/lib/auth/session-generation';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

const BCRYPT_ROUNDS = 12;

/**
 * GP-760: spend a password-reset link and set the new password in ONE conditional UPDATE.
 *
 * The link carries the session generation it was issued under (session-generation.ts). It is
 * usable only while that is still the user's generation, and the same statement adds one. So:
 *   - the link works once: a second use, even concurrent, re-reads the row after the first commits
 *     and no longer matches (Postgres re-checks the WHERE on the updated row), so it updates 0 rows;
 *   - every other link of the same generation dies with it; a link requested after the reset
 *     carries the new generation and works, even in the same clock second;
 *   - every session of the old generation is refused, which ends the user's other sessions. The
 *     caller then mints the new session from the database, so it carries the new generation.
 * A deactivated account cannot reset. Returns true only when exactly this request spent the link.
 */
export async function consumePasswordReset(
  userId: string,
  generation: number,
  hashedPassword: string
): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE "lms_users"
       SET "hashed_password" = ${hashedPassword},
           "is_verified" = true,
           "session_generation" = "session_generation" + 1,
           "updated_at" = now()
     WHERE "id" = ${userId}::uuid
       AND "is_active" = true
       AND "session_generation" = ${generation}::integer`;
  return updated === 1;
}

/** Rows created only for JWT sync (e.g. ensureLmsUserFromClaims) are not password-login accounts. */
function isJwtProvisionedPasswordHash(hash: string): boolean {
  return hash.startsWith('jwt:');
}

const PROVISIONAL_PASSWORD_PREFIX = 'provisional:';

/**
 * An account whose password was never set by a human — a JWT-sync placeholder
 * (`jwt:`) or a Stripe-provisioned guest (`provisional:`). Such an account may be
 * *claimed* by its rightful owner (finish signup / set a password). An
 * *established* real-password account must never be overwritten by an
 * unauthenticated path — that is the guest-checkout account-takeover (WS1 / P0-A).
 */
export function isProvisionalPasswordHash(hash: string): boolean {
  return isJwtProvisionedPasswordHash(hash) || hash.startsWith(PROVISIONAL_PASSWORD_PREFIX);
}

export type LoginFailureKind = 'invalid' | 'needs_password_setup';

/**
 * Copy for a guest-checkout account that has never had a human-set password.
 * Do not use "Invalid credentials" here — that reads as a typo, and those
 * buyers never received a password they could type.
 */
export const NEEDS_PASSWORD_SETUP_MESSAGE =
  'This account does not have a password yet. Set one from the link we send you — it is not that the password was wrong.';

/**
 * After a failed password check: if the row is an unclaimed provisional
 * account, point the buyer at set-password. Every other miss stays a generic
 * invalid so login cannot enumerate established accounts.
 */
export function classifyLoginFailure(
  user: { isActive: boolean; hashedPassword: string } | null | undefined,
): LoginFailureKind {
  if (user?.isActive && isProvisionalPasswordHash(user.hashedPassword)) {
    return 'needs_password_setup';
  }
  return 'invalid';
}

export async function loginFailureKindForEmail(email: string): Promise<LoginFailureKind> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 'invalid';
  try {
    const user = await prisma.lmsUser.findUnique({
      where: { email: normalized },
      select: { isActive: true, hashedPassword: true },
    });
    return classifyLoginFailure(user);
  } catch {
    return 'invalid';
  }
}

/** An opaque, non-authenticating placeholder for an unclaimed provisional account. */
export function provisionalPasswordHash(): string {
  return `${PROVISIONAL_PASSWORD_PREFIX}${randomUUID()}`;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || isProvisionalPasswordHash(stored)) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plain, stored);
  }
  return false;
}

/**
 * Pure: a user's effective LMS role from their lms_user_roles names (which win) and the legacy
 * lms_users.role column (the fallback). The ONE rule for both the session token and the database
 * re-validation of admins (current-admin.ts), so the two can never disagree.
 */
export function pickSessionRole(roleNames: Iterable<string>, columnRole: string | null): string {
  const names = new Set([...roleNames].map((n) => n.trim().toLowerCase()));
  if (names.has('admin')) return 'admin';
  if (names.has('instructor')) return 'instructor';
  if (names.has('student')) return 'student';
  const col = columnRole?.trim().toLowerCase();
  if (col && ['admin', 'instructor', 'student'].includes(col)) return col;
  return 'student';
}

/** A Prisma client or interactive transaction (anything that can run a tagged raw query). */
export type RawQueryClient = {
  $queryRaw: <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

/** An LMS user as the database has them now (GP-760). */
export type LmsUserNow = {
  id: string;
  email: string;
  fullName: string | null;
  active: boolean;
  /** Effective role: pickSessionRole over lms_user_roles, then the lms_users.role column. */
  role: string;
  /** lms_users.session_generation (session-generation.ts). */
  generation: number;
};

/**
 * GP-760: read one LMS user's identity, active flag, effective role and session generation in ONE
 * statement (primary-key lookup on lms_users plus its lms_user_roles rows). The role is computed by
 * pickSessionRole, exactly as resolveCurrentAdmin computes it. Null when the user does not exist.
 * No row locks: this gates a request or mints a session, it does not order an action; actions that
 * must be ordered against a demotion use resolveCurrentAdmin inside their transaction.
 */
export async function readLmsUserNow(db: RawQueryClient, userId: string): Promise<LmsUserNow | null> {
  if (!userId) return null;
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      email: string;
      full_name: string | null;
      is_active: boolean;
      role: string | null;
      session_generation: number | string | null;
      role_names: string[] | null;
    }>
  >`
    SELECT u."id", u."email", u."full_name", u."is_active", u."role", u."session_generation",
           array_remove(array_agg(r."name"), NULL) AS "role_names"
      FROM "lms_users" u
      LEFT JOIN "lms_user_roles" ur ON ur."user_id" = u."id"
      LEFT JOIN "lms_roles" r ON r."id" = ur."role_id"
     WHERE u."id" = ${userId}::uuid
     GROUP BY u."id"`;
  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    active: user.is_active === true,
    role: pickSessionRole(user.role_names ?? [], user.role),
    generation: Number(user.session_generation ?? 0),
  };
}

/** Session claims for a user read by readLmsUserNow: the current role and session generation. */
function claimsFromUser(user: LmsUserNow): SessionClaims {
  return {
    sub: user.id,
    email: user.email,
    full_name: user.fullName?.trim() || user.email,
    role: user.role,
    sg: user.generation,
  };
}

/**
 * Claims for a new session, read from the database now in one statement (readLmsUserNow): the user
 * must be active, the role is the current database role and the session generation is the current
 * one. With `sessionGeneration` (GP-760, token refresh), the session being renewed must also carry
 * the user's current generation, so a session ended by a password reset cannot be renewed.
 */
export async function sessionClaimsForUserId(
  userId: string,
  options: { sessionGeneration?: number } = {}
): Promise<SessionClaims | null> {
  const user = await readLmsUserNow(prisma, userId);
  if (!user || !user.active) return null;
  if (
    options.sessionGeneration !== undefined &&
    !isCurrentGeneration(options.sessionGeneration, user.generation)
  ) {
    return null;
  }
  return claimsFromUser(user);
}

export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<SessionClaims | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const user = await prisma.lmsUser.findUnique({ where: { email: normalized } });
  if (!user || !user.isActive) return null;

  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) return null;

  // GP-760: mint only for the generation the checked password belongs to. If a password reset
  // committed between reading the hash and here, the generation has moved on and the old
  // password must not produce a session of the new generation.
  return sessionClaimsForUserId(user.id, { sessionGeneration: user.sessionGeneration });
}

export type RegisterPrismaResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; code: 'EMAIL_TAKEN' };

async function ensureStudentRole(userId: string): Promise<void> {
  const studentRole = await prisma.lmsRole.findUnique({ where: { name: 'student' } });
  if (!studentRole) return;
  try {
    await prisma.lmsUserRole.create({
      data: { userId, roleId: studentRole.id },
    });
  } catch {
    // Role row race / duplicate — non-fatal
  }
}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    e !== null && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002'
  );
}

export async function registerUserWithPassword(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<RegisterPrismaResult> {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  // A reserved staff address is never created or claimed by an unverified signup.
  if (isReservedStaffEmail(email)) return { ok: false, code: 'EMAIL_TAKEN' };
  const hashedPassword = await hashPassword(params.password);

  const existing = await prisma.lmsUser.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isActive) {
      return { ok: false, code: 'EMAIL_TAKEN' };
    }

    // JWT-sync placeholder row — let the user finish signup with a real password.
    if (isJwtProvisionedPasswordHash(existing.hashedPassword)) {
      await prisma.lmsUser.update({
        where: { id: existing.id },
        data: {
          hashedPassword,
          fullName: fullName || existing.fullName,
          role: 'student',
        },
      });
      await ensureStudentRole(existing.id);
      const claims = await sessionClaimsForUserId(existing.id);
      if (!claims) return { ok: false, code: 'EMAIL_TAKEN' };
      return { ok: true, claims };
    }

    // Existing real-password account. Always report EMAIL_TAKEN regardless of
    // the supplied password — never confirm whether it matches, so register
    // cannot be used as an unauthenticated password-checking oracle.
    return { ok: false, code: 'EMAIL_TAKEN' };
  }

  const id = randomUUID();
  try {
    await prisma.lmsUser.create({
      data: {
        id,
        email,
        hashedPassword,
        fullName,
        isActive: true,
        isVerified: false,
        role: 'student',
      },
    });
  } catch (e: unknown) {
    if (isUniqueConstraintError(e)) {
      return { ok: false, code: 'EMAIL_TAKEN' };
    }
    throw e;
  }

  await ensureStudentRole(id);

  return {
    ok: true,
    claims: {
      sub: id,
      email,
      full_name: fullName,
      role: 'student',
    },
  };
}

/**
 * GP-699 — the one place an account is marked email-verified from a confirm
 * link. Only an active account that still has the address the link was issued
 * for is changed. Returns false when nothing matched, so the caller never
 * reports a confirmation that did not happen.
 */
export async function markEmailVerified(userId: string, email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!userId || !normalized) return false;
  const result = await prisma.lmsUser.updateMany({
    where: { id: userId, email: normalized, isActive: true },
    data: { isVerified: true },
  });
  return result.count > 0;
}
