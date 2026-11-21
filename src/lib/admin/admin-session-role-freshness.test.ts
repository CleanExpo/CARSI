import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken, verifySessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

/**
 * GP-760 (a): admin access and token refresh follow the user's role and active status in the
 * database NOW, not the role written into a 7-day token. A demoted or deactivated admin loses the
 * admin panel on the next request, and a refresh can never carry a stale role forward.
 */

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}));

type DbUser = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: string | null;
  roleNames: string[];
  sessionsValidAfterSec: bigint | null;
};

const db = vi.hoisted(() => ({
  user: null as null | DbUser,
  fail: false,
}));

vi.mock('@/lib/prisma', () => {
  const sqlOf = (strings: TemplateStringsArray) => strings.join('?');
  return {
    prisma: {
      // The admin gate's single statement (and the auth rate limit's upsert).
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        if (db.fail) throw new Error('db down');
        const sql = sqlOf(strings);
        if (sql.includes('auth_rate_limits')) {
          return [{ count: 1, reset_ms: Date.now() + 60_000 }];
        }
        if (sql.includes('lms_users') && db.user) {
          return [
            {
              id: db.user.id,
              email: db.user.email,
              is_active: db.user.isActive,
              role: db.user.role,
              // pg returns BIGINT through a raw query as a string
              sessions_valid_after_sec:
                db.user.sessionsValidAfterSec === null ? null : String(db.user.sessionsValidAfterSec),
              role_names: db.user.roleNames,
            },
          ];
        }
        return [];
      }),
      $executeRaw: vi.fn(async () => 0),
      lmsUser: {
        findUnique: vi.fn(async () => {
          if (db.fail) throw new Error('db down');
          if (!db.user) return null;
          return {
            id: db.user.id,
            email: db.user.email,
            fullName: db.user.fullName,
            isActive: db.user.isActive,
            role: db.user.role,
            sessionsValidAfterSec: db.user.sessionsValidAfterSec,
          };
        }),
      },
      lmsUserRole: {
        findMany: vi.fn(async () =>
          (db.user?.roleNames ?? []).map((name) => ({ role: { name } }))
        ),
      },
    },
  };
});

const { getAdminSessionOrNull } = await import('./admin-session');
const { POST: refresh } = await import('../../../app/api/auth/refresh/route');

const USER_ID = '20000000-0000-4000-8000-000000000760';
const EMAIL = 'trainer@example.test';

function adminClaims(): SessionClaims {
  return { sub: USER_ID, email: EMAIL, full_name: 'Trainer', role: 'admin' };
}

function dbUser(over: Partial<DbUser> = {}): DbUser {
  return {
    id: USER_ID,
    email: EMAIL,
    fullName: 'Trainer',
    isActive: true,
    role: null,
    roleNames: ['admin'],
    sessionsValidAfterSec: null,
    ...over,
  };
}

async function adminView() {
  jar.clear();
  jar.set('auth_token', await signSessionToken(adminClaims()));
  return getAdminSessionOrNull();
}

async function refreshWith(token: string) {
  return refresh(
    new NextRequest('https://carsi.example.test/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'x-forwarded-for': '198.51.100.7' },
    })
  );
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://configured');
  vi.stubEnv('ADMIN_EMAIL', 'support@carsi.com.au');
  db.user = dbUser();
  db.fail = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  jar.clear();
});

describe('GP-760 admin panel: the database role now, not the token role', () => {
  it('a current admin keeps the admin panel', async () => {
    expect(await adminView()).toEqual({ email: EMAIL });
  });

  it('a demoted admin (token still says admin) loses it on the next request', async () => {
    db.user = dbUser({ roleNames: ['student'] });
    expect(await adminView()).toBeNull();
  });

  it('an admin demoted through the lms_users.role column, with no role rows, loses it', async () => {
    db.user = dbUser({ roleNames: [], role: 'student' });
    expect(await adminView()).toBeNull();
  });

  it('a deactivated admin loses it', async () => {
    db.user = dbUser({ isActive: false });
    expect(await adminView()).toBeNull();
  });

  it('a deleted admin loses it', async () => {
    db.user = null;
    expect(await adminView()).toBeNull();
  });

  it('an admin session ended by a password reset loses it', async () => {
    db.user = dbUser({ sessionsValidAfterSec: BigInt(Math.floor(Date.now() / 1000) + 5) });
    expect(await adminView()).toBeNull();
  });

  it('refuses admin access when the database cannot be read (fails closed)', async () => {
    db.fail = true;
    expect(await adminView()).toBeNull();
  });
});

describe('GP-760 token-role checks on request handlers (instructor/admin gates)', () => {
  it('a demoted admin token no longer passes the request session reader', async () => {
    const { getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request');
    const { __clearActiveCache } = await import('@/lib/server/user-active-cache');
    const token = await signSessionToken(adminClaims());
    const req = () =>
      new NextRequest('https://carsi.example.test/api/lms/courses', {
        method: 'POST',
        headers: { cookie: `auth_token=${token}` },
      });

    __clearActiveCache();
    expect((await getSessionClaimsFromRequest(req()))?.role).toBe('admin');

    db.user = dbUser({ roleNames: ['student'] });
    __clearActiveCache(); // the 30-second cache is per instance; a new read sees the demotion
    expect(await getSessionClaimsFromRequest(req())).toBeNull();
  });
});

describe('GP-760 token refresh: minted from the database, never re-signed from old claims', () => {
  it('a demoted admin refreshes into a student session', async () => {
    db.user = dbUser({ roleNames: ['student'] });
    const res = await refreshWith(await signSessionToken(adminClaims()));
    expect(res.status).toBe(200);
    const renewed = await verifySessionToken(res.cookies.get('auth_token')?.value ?? '');
    expect(renewed?.role).toBe('student');
  });

  it('a deactivated user cannot refresh, and the session cookies are cleared', async () => {
    db.user = dbUser({ isActive: false });
    const res = await refreshWith(await signSessionToken(adminClaims()));
    expect(res.status).toBe(401);
    expect(res.cookies.get('auth_token')?.value).toBe('');
  });

  it('a session ended by a password reset cannot be refreshed into a new one', async () => {
    db.user = dbUser({ sessionsValidAfterSec: BigInt(Math.floor(Date.now() / 1000) + 5) });
    const res = await refreshWith(await signSessionToken(adminClaims()));
    expect(res.status).toBe(401);
  });

  it('a current admin refreshes as admin', async () => {
    const res = await refreshWith(await signSessionToken(adminClaims()));
    expect(res.status).toBe(200);
    const renewed = await verifySessionToken(res.cookies.get('auth_token')?.value ?? '');
    expect(renewed?.role).toBe('admin');
  });
});
