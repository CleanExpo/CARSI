import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

const BCRYPT_ROUNDS = 12;

/** Rows created only for JWT sync (e.g. ensureLmsUserFromClaims) are not password-login accounts. */
function isJwtProvisionedPasswordHash(hash: string): boolean {
  return hash.startsWith('jwt:');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || isJwtProvisionedPasswordHash(stored)) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plain, stored);
  }
  return false;
}

export async function resolveSessionRole(
  userId: string,
  columnRole: string | null
): Promise<string> {
  const rows = await prisma.lmsUserRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const names = new Set(rows.map((r) => r.role.name.toLowerCase()));
  if (names.has('admin')) return 'admin';
  if (names.has('instructor')) return 'instructor';
  if (names.has('student')) return 'student';
  const col = columnRole?.trim().toLowerCase();
  if (col && ['admin', 'instructor', 'student'].includes(col)) return col;
  return 'student';
}

export async function sessionClaimsForUserId(userId: string): Promise<SessionClaims | null> {
  const user = await prisma.lmsUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  const role = await resolveSessionRole(user.id, user.role);
  return {
    sub: user.id,
    email: user.email,
    full_name: user.fullName?.trim() || user.email,
    role,
  };
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

  const role = await resolveSessionRole(user.id, user.role);
  return {
    sub: user.id,
    email: user.email,
    full_name: user.fullName?.trim() || user.email,
    role,
  };
}

export type RegisterPrismaResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; code: 'EMAIL_TAKEN' };

export async function registerUserWithPassword(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<RegisterPrismaResult> {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  const id = randomUUID();
  const hashedPassword = await hashPassword(params.password);

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
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    ) {
      return { ok: false, code: 'EMAIL_TAKEN' };
    }
    throw e;
  }

  const studentRole = await prisma.lmsRole.findUnique({ where: { name: 'student' } });
  if (studentRole) {
    try {
      await prisma.lmsUserRole.create({
        data: { userId: id, roleId: studentRole.id },
      });
    } catch {
      // Role row race / duplicate — non-fatal
    }
  }

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
