import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

/**
 * GP-760 (a), review round 1: every reader that turns a session into staff access or shows it
 * uses the database role now, and a refresh reads the user and roles in ONE statement.
 *   - draft course files (proxy hasStaffSession): a demoted admin's old token is no longer staff;
 *   - GET /api/auth/me: roles and can_access_admin come from the database, not the token;
 *   - POST /api/auth/refresh: one indexed read of the user and roles, not two.
 */

type DbUser = { isActive: boolean; role: string | null; roleNames: string[] };

const db = vi.hoisted(() => ({
  user: null as null | DbUser,
  fail: false,
  userReads: 0,
}));

const USER_ID = '20000000-0000-4000-8000-000000000761';
const EMAIL = 'trainer2@example.test';

vi.mock('@/lib/prisma', () => {
  const sqlOf = (strings: TemplateStringsArray) => strings.join('?');
  const row = () => ({
    id: USER_ID,
    email: EMAIL,
    full_name: 'Trainer Two',
    is_active: db.user!.isActive,
    role: db.user!.role,
    sessions_valid_after_sec: null,
    session_generation: 0,
    role_names: db.user!.roleNames,
  });
  return {
    prisma: {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        if (db.fail) throw new Error('db down');
        const sql = sqlOf(strings);
        if (sql.includes('auth_rate_limits')) return [{ count: 1, reset_ms: Date.now() + 60_000 }];
        if (sql.includes('lms_users')) {
          db.userReads += 1;
          return db.user ? [row()] : [];
        }
        return [];
      }),
      $executeRaw: vi.fn(async () => 0),
      lmsUser: {
        findUnique: vi.fn(async () => {
          if (db.fail) throw new Error('db down');
          db.userReads += 1;
          if (!db.user) return null;
          return {
            id: USER_ID,
            email: EMAIL,
            fullName: 'Trainer Two',
            isActive: db.user.isActive,
            isVerified: true,
            themePreference: 'dark',
            role: db.user.role,
            sessionsValidAfterSec: null,
            sessionGeneration: 0,
          };
        }),
      },
      lmsUserRole: {
        findMany: vi.fn(async () => {
          db.userReads += 1;
          return (db.user?.roleNames ?? []).map((name) => ({ role: { name } }));
        }),
      },
      lmsCourse: { findFirst: vi.fn(async () => null) },
    },
  };
});

const { hasStaffSession } = await import('@/lib/courses/course-asset-access');
const { GET: me } = await import('../../../app/api/auth/me/route');
const { POST: refresh } = await import('../../../app/api/auth/refresh/route');

function adminToken() {
  const claims: SessionClaims = { sub: USER_ID, email: EMAIL, full_name: 'Trainer Two', role: 'admin' };
  return signSessionToken(claims);
}

function jarOf(token: string) {
  return { get: (name: string) => (name === 'auth_token' ? { value: token } : undefined) };
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://configured');
  db.user = { isActive: true, role: null, roleNames: ['admin'] };
  db.fail = false;
  db.userReads = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GP-760 draft course files: staff means an admin in the database now', () => {
  it('a current admin is staff', async () => {
    expect(await hasStaffSession(jarOf(await adminToken()))).toBe(true);
  });

  it('a demoted admin (token still says admin) is not staff', async () => {
    db.user = { isActive: true, role: null, roleNames: ['student'] };
    expect(await hasStaffSession(jarOf(await adminToken()))).toBe(false);
  });

  it('a deactivated admin is not staff', async () => {
    db.user = { isActive: false, role: null, roleNames: ['admin'] };
    expect(await hasStaffSession(jarOf(await adminToken()))).toBe(false);
  });

  it('is not staff when the database cannot be read (fails closed)', async () => {
    db.fail = true;
    expect(await hasStaffSession(jarOf(await adminToken()))).toBe(false);
  });
});

describe('GP-760 /api/auth/me shows the database role now', () => {
  it('a demoted admin is shown as a student with no admin toggle', async () => {
    db.user = { isActive: true, role: null, roleNames: ['student'] };
    const res = await me(
      new NextRequest('https://carsi.example.test/api/auth/me', {
        headers: { cookie: `auth_token=${await adminToken()}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { roles: string[]; can_access_admin: boolean };
    expect(body.roles).toEqual(['student']);
    expect(body.can_access_admin).toBe(false);
  });

  it('a current admin keeps the admin toggle', async () => {
    const res = await me(
      new NextRequest('https://carsi.example.test/api/auth/me', {
        headers: { cookie: `auth_token=${await adminToken()}` },
      })
    );
    const body = (await res.json()) as { roles: string[]; can_access_admin: boolean };
    expect(body.can_access_admin).toBe(true);
  });

  // GP-760 review of f512fd90 (fail closed): with a database configured, /me reports a signed-in
  // user only when the database confirms the session; an unreadable database or a missing user is
  // not a session.
  it('reports no session when the database cannot be read', async () => {
    db.fail = true;
    const res = await me(
      new NextRequest('https://carsi.example.test/api/auth/me', {
        headers: { cookie: `auth_token=${await adminToken()}` },
      })
    );
    expect(res.status).toBe(401);
  });

  it('reports no session for a user the database does not have', async () => {
    db.user = null;
    const res = await me(
      new NextRequest('https://carsi.example.test/api/auth/me', {
        headers: { cookie: `auth_token=${await adminToken()}` },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe('GP-760 refresh: one database read for the user and roles', () => {
  it('reads the user and roles in a single statement', async () => {
    const res = await refresh(
      new NextRequest('https://carsi.example.test/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `auth_token=${await adminToken()}`, 'x-forwarded-for': '198.51.100.8' },
      })
    );
    expect(res.status).toBe(200);
    expect(db.userReads).toBe(1);
  });
});
