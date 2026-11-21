/**
 * GP-760 (a): the admin-panel gate's single statement (isLmsAdminNow) on a REAL PostgreSQL.
 *
 * The gate fails closed, so a wrong column, cast or array decode would lock every LMS admin out
 * without any unit test noticing. This walks one user through the database states that decide it:
 * admin role row present, role row removed, deactivated, and a session issued before the cut-off.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. It
 * needs a disposable loopback database (src/test-utils/pg-disposable.ts); locally it skips.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('GP-760 admin role freshness (real PostgreSQL)', () => {
    const refusal = TARGET.refusal;
    if (refusal) {
      it('refuses: needs a disposable loopback DATABASE_URL (CARSI_PG_DISPOSABLE=1)', () => {
        throw new Error(refusal);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('GP-760 admin role freshness (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const userId = randomUUID();
  let adminRoleId = 0;
  let createdRole = false;

  let isLmsAdminNow: typeof import('@/lib/server/current-admin').isLmsAdminNow;
  let prisma: typeof import('@/lib/prisma').prisma;

  beforeAll(async () => {
    await db.connect();
    const inserted = await db.query(
      "INSERT INTO lms_roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING RETURNING id"
    );
    if (inserted.rows[0]) {
      adminRoleId = inserted.rows[0].id;
      createdRole = true;
    } else {
      adminRoleId = (await db.query("SELECT id FROM lms_roles WHERE name = 'admin'")).rows[0].id;
    }
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password, is_active) VALUES ($1, $2, 'x', true)",
      [userId, `admin-${run}@role-walk.invalid`]
    );
    ({ isLmsAdminNow } = await import('@/lib/server/current-admin'));
    ({ prisma } = await import('@/lib/prisma'));
  });

  afterAll(async () => {
    await db.query('DELETE FROM lms_users WHERE id = $1', [userId]).catch(() => {});
    if (createdRole) await db.query('DELETE FROM lms_roles WHERE id = $1', [adminRoleId]).catch(() => {});
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
  });

  it('follows the database: role row, removal, deactivation and the session generation', async () => {
    // No role row and no column role: not an admin.
    expect(await isLmsAdminNow(prisma, userId, 0)).toBe(false);

    await db.query('INSERT INTO lms_user_roles (user_id, role_id) VALUES ($1, $2)', [
      userId,
      adminRoleId,
    ]);
    expect(await isLmsAdminNow(prisma, userId, 0)).toBe(true);

    // A session from an earlier generation is refused; one from the current generation is accepted.
    const cutoff = 1;
    await db.query('UPDATE lms_users SET session_generation = $2 WHERE id = $1', [userId, cutoff]);
    expect(await isLmsAdminNow(prisma, userId, 0)).toBe(false);
    expect(await isLmsAdminNow(prisma, userId, cutoff)).toBe(true);

    await db.query('UPDATE lms_users SET is_active = false WHERE id = $1', [userId]);
    expect(await isLmsAdminNow(prisma, userId, cutoff)).toBe(false);

    await db.query('UPDATE lms_users SET is_active = true WHERE id = $1', [userId]);
    await db.query('DELETE FROM lms_user_roles WHERE user_id = $1', [userId]);
    expect(await isLmsAdminNow(prisma, userId, cutoff)).toBe(false);

    // The lms_users.role column alone still counts, as pickSessionRole defines.
    await db.query("UPDATE lms_users SET role = 'admin' WHERE id = $1", [userId]);
    expect(await isLmsAdminNow(prisma, userId, cutoff)).toBe(true);

    // An unknown user is not an admin.
    expect(await isLmsAdminNow(prisma, randomUUID(), 0)).toBe(false);
  });
});
