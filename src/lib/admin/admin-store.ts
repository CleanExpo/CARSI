// src/lib/admin/admin-store.ts — RA-3027.
//
// Database-backed admin lookup. Backwards-compatible with the env-var
// gate: while the `admin_users` table is empty, login routes fall back
// to ADMIN_EMAIL+ADMIN_PASSWORD env-vars. Once at least one row exists,
// the env-var path is locked out (verifyAdminByEmail returns null on
// no-match instead of bouncing to env).
//
// Password hashing: bcryptjs (cost 12) — matches the LmsUser pattern
// already used in this codebase. No new crypto dep added.

import { compare, hash } from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { getAdminEmail, getAdminPassword } from '@/lib/admin/admin-auth';

const BCRYPT_COST = 12;

export interface AdminRecord {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

/** Number of admins currently in the DB. Used to decide whether the
 *  env-var bootstrap path is still active. */
export async function adminCount(): Promise<number> {
  try {
    return await prisma.adminUser.count();
  } catch {
    // If the migration hasn't run yet, the table doesn't exist —
    // treat as zero so the env-var path stays alive.
    return 0;
  }
}

/** Look up an admin by email and verify the password. Returns the
 *  AdminRecord on success, null on no-match / wrong-password / inactive.
 *  Uses bcryptjs `compare` for constant-time verification. */
export async function verifyAdminByEmail(
  email: string,
  password: string,
): Promise<AdminRecord | null> {
  const row = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!row || !row.isActive) return null;
  const ok = await compare(password, row.passwordHash);
  if (!ok) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
  };
}

/** Bootstrap: copy the current ADMIN_EMAIL + ADMIN_PASSWORD env vars
 *  into the table as the first admin. Idempotent — refuses to run if
 *  any row already exists.
 *
 *  Invoked manually via the `db:admin-bootstrap` script (see
 *  package.json after this PR merges). NOT called automatically on
 *  login — that would create a race where a misconfigured env-var
 *  could lock the operator out. */
export async function bootstrapAdminFromEnv(): Promise<AdminRecord | null> {
  if ((await adminCount()) > 0) {
    return null; // Refuse — env-var path already retired.
  }
  const email = getAdminEmail().toLowerCase();
  const password = getAdminPassword();
  if (!email || !password) {
    throw new Error(
      'Cannot bootstrap admin: ADMIN_EMAIL or ADMIN_PASSWORD env var is unset.',
    );
  }
  const passwordHash = await hash(password, BCRYPT_COST);
  const row = await prisma.adminUser.create({
    data: { email, passwordHash, role: 'admin' },
  });
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
  };
}

/** Update `lastLoginAt` / `lastLoginIp`. Best-effort — failure is
 *  swallowed because we don't want a stat-table outage to block login. */
export async function recordAdminLogin(id: string, ip: string | null): Promise<void> {
  try {
    await prisma.adminUser.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  } catch (err) {
    console.warn('[admin-store] recordAdminLogin failed (non-fatal):', err);
  }
}
