import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';

/**
 * GP-760 (b), unit level: the reset route refuses a link the database did not spend, and the
 * session reader refuses a session issued before the cut-off the reset wrote. The database is a
 * small in-memory stand-in for one lms_users row whose `$executeRaw` re-implements the UPDATE's
 * WHERE, so this file does NOT test that SQL predicate: a mutant that drops it still passes here.
 * The predicate, and its atomicity under a concurrent double submit, are proved on Postgres in
 * auth-reset-password-single-use.pg.test.ts.
 */

const USER_ID = '30000000-0000-4000-8000-000000000760';
const EMAIL = 'learner@example.test';

const row = vi.hoisted(() => ({
  current: {
    isActive: true,
    hashedPassword: 'x',
    isVerified: false,
    sessionsValidAfterSec: null as bigint | null,
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: vi.fn(async () => ({
        id: USER_ID,
        email: EMAIL,
        fullName: 'Learner',
        role: null,
        ...row.current,
      })),
      // The pre-GP-760 route wrote the password with a plain update: it always "succeeds".
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(row.current, data);
        return {};
      }),
    },
    lmsUserRole: { findMany: vi.fn(async () => []) },
    // consumePasswordReset's conditional UPDATE: values are
    // [hashedPassword, cutoffSec, userId, issuedAt] in template order.
    $executeRaw: vi.fn(async (_s: TemplateStringsArray, ...values: unknown[]) => {
      const [hashedPassword, cutoffSec, , issuedAt] = values as [string, number, string, number];
      const sva = row.current.sessionsValidAfterSec;
      if (!row.current.isActive) return 0;
      if (sva !== null && !(Number(sva) < issuedAt)) return 0;
      Object.assign(row.current, {
        hashedPassword,
        isVerified: true,
        sessionsValidAfterSec: BigInt(cutoffSec),
      });
      return 1;
    }),
    // The auth rate limit's upsert (always within the limit here) and the session reader's
    // one-statement user read (readLmsUserNow).
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join('?').includes('auth_rate_limits')) {
        return [{ count: 1, reset_ms: Date.now() + 60_000 }];
      }
      return [
        {
          is_active: row.current.isActive,
          role: null,
          sessions_valid_after_sec:
            row.current.sessionsValidAfterSec === null ? null : String(row.current.sessionsValidAfterSec),
          role_names: ['student'],
        },
      ];
    }),
  },
}));

const { POST: reset } = await import('../../../app/api/auth/reset-password/route');
const { getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request');
const { __clearActiveCache } = await import('@/lib/server/user-active-cache');

const nowSec = () => Math.floor(Date.now() / 1000);

function resetLink(iat: number) {
  return new SignJWT({ purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 3600)
    .sign(getSessionSecretBytes());
}

function session(iat: number) {
  return new SignJWT({ email: EMAIL, full_name: 'Learner', role: 'student' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 7 * 86400)
    .sign(getSessionSecretBytes());
}

function post(token: string) {
  return new NextRequest('https://carsi.example.test/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.20' },
    body: JSON.stringify({ token, new_password: 'A-strong-pass-9' }),
  });
}

function withSession(token: string) {
  return new NextRequest('https://carsi.example.test/api/lms/anything', {
    headers: { cookie: `auth_token=${token}` },
  });
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://configured');
  row.current = { isActive: true, hashedPassword: 'x', isVerified: false, sessionsValidAfterSec: null };
  __clearActiveCache();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('GP-760 password reset link is single-use and ends other sessions', () => {
  it('accepts the link once and refuses it the second time', async () => {
    const link = await resetLink(nowSec() - 10);
    const first = await reset(post(link));
    expect(first.status).toBe(200);
    const second = await reset(post(link));
    expect(second.status).toBe(400);
  });

  it('ends a session issued before the reset, and keeps the session the reset issued', async () => {
    const before = await session(nowSec() - 30);
    expect(await getSessionClaimsFromRequest(withSession(before))).not.toBeNull();

    const res = await reset(post(await resetLink(nowSec() - 10)));
    expect(res.status).toBe(200);
    const issued = res.cookies.get('auth_token')?.value ?? '';

    expect(await getSessionClaimsFromRequest(withSession(before))).toBeNull();
    expect(await getSessionClaimsFromRequest(withSession(issued))).not.toBeNull();
  });

  it('refuses a deactivated account', async () => {
    row.current.isActive = false;
    const res = await reset(post(await resetLink(nowSec() - 10)));
    expect(res.status).toBe(400);
  });
});
