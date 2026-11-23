/**
 * GP-760 (b), review round 1: everything happens in ONE clock second, on a REAL PostgreSQL,
 * through the real mint paths (sessionClaimsForUserId + signSessionToken, forgot-password,
 * reset-password, login).
 *
 *   1. A session minted in the same second as a reset is ended by that reset.
 *   2. A new reset link requested in the same second, after the reset, still works once.
 *   3. Signing in with the new password after the reset gives a session that is accepted.
 *
 * The clock is frozen (Date only), so the whole walk shares one second on every run. A wall-clock
 * version would pass on the old cut-off code whenever a second boundary fell between the steps.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`). Locally it needs a disposable loopback database
 * (src/test-utils/pg-disposable.ts); otherwise it skips.
 */
import { createHash, randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('GP-760 same-second session generation (real PostgreSQL)', () => {
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

const sent = vi.hoisted(() => ({ links: [] as string[] }));
vi.mock('@/lib/server/auth-email', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/server/auth-email')>();
  return {
    ...real,
    isEmailConfigured: () => true,
    sendPasswordResetEmail: async (args: { resetLink: string }) => {
      sent.links.push(args.resetLink);
      return { sent: true };
    },
  };
});

describe.runIf(RUNNABLE)('GP-760 same-second session generation (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const email = `samesec-${run}@reset-walk.invalid`;
  const ips = ['198.51.100.81', '198.51.100.82', '198.51.100.83', '198.51.100.84'];
  const limitKeys = [
    ...ips.flatMap((ip) => [`auth-reset-pw-ip:${ip}`, `forgot-pw-ip:${ip}`]),
    `forgot-pw-email:${email}`,
    `auth-refresh:${userId}`,
  ].map((k) => createHash('sha256').update(k).digest('hex'));

  let forgotPOST: typeof import('../../../app/api/auth/forgot-password/route').POST;
  let resetPOST: typeof import('../../../app/api/auth/reset-password/route').POST;
  let refreshPOST: typeof import('../../../app/api/auth/refresh/route').POST;
  let lmsAuth: typeof import('@/lib/server/lms-auth');
  let jwt: typeof import('@/lib/auth/session-jwt');
  let getSessionClaimsFromRequest: typeof import('@/lib/server/auth-from-request').getSessionClaimsFromRequest;
  let clearCache: () => void;
  let prisma: typeof import('@/lib/prisma').prisma;

  beforeAll(async () => {
    if (!process.env.JWT_SECRET?.trim()) {
      vi.stubEnv('JWT_SECRET', 'gp760-test-only-jwt-placeholder-0123456789abcdef');
    }
    await db.connect();
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password, full_name, is_active) VALUES ($1, $2, 'x', 'Same Second', true)",
      [userId, email]
    );
    ({ POST: forgotPOST } = await import('../../../app/api/auth/forgot-password/route'));
    ({ POST: resetPOST } = await import('../../../app/api/auth/reset-password/route'));
    ({ POST: refreshPOST } = await import('../../../app/api/auth/refresh/route'));
    lmsAuth = await import('@/lib/server/lms-auth');
    jwt = await import('@/lib/auth/session-jwt');
    ({ getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request'));
    ({ __clearActiveCache: clearCache } = await import('@/lib/server/user-active-cache'));
    ({ prisma } = await import('@/lib/prisma'));
  });

  afterAll(async () => {
    vi.useRealTimers();
    await db.query('DELETE FROM lms_users WHERE id = $1', [userId]).catch(() => {});
    await db
      .query('DELETE FROM auth_rate_limits WHERE key = ANY($1::text[])', [limitKeys])
      .catch(() => {});
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
    vi.unstubAllEnvs();
  });

  const post = (url: string, body: unknown, ip: string) =>
    new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    });

  async function requestLink(ip: string): Promise<string> {
    const before = sent.links.length;
    const res = await forgotPOST(post('https://carsi.example.test/api/auth/forgot-password', { email }, ip));
    expect(res.status).toBe(200);
    expect(sent.links.length).toBe(before + 1);
    return new URL(sent.links[sent.links.length - 1]).searchParams.get('token') ?? '';
  }

  async function reset(token: string, password: string, ip: string) {
    return resetPOST(
      post('https://carsi.example.test/api/auth/reset-password', { token, new_password: password }, ip)
    );
  }

  async function accepted(token: string): Promise<boolean> {
    clearCache();
    const req = new NextRequest('https://carsi.example.test/x', {
      headers: { cookie: `auth_token=${token}` },
    });
    return (await getSessionClaimsFromRequest(req)) !== null;
  }

  async function refreshStatus(token: string): Promise<number> {
    const req = new NextRequest('https://carsi.example.test/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'x-forwarded-for': ips[3] },
    });
    return (await refreshPOST(req)).status;
  }

  it('a reset ends a session minted in the same second, and a new link from that second works', async () => {
    // Freeze the clock mid-second: every token below carries the same iat.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Math.floor(Date.now() / 1000) * 1000 + 400));

    const claims = await lmsAuth.sessionClaimsForUserId(userId);
    expect(claims).not.toBeNull();
    const oldSession = await jwt.signSessionToken(claims!);
    expect(await accepted(oldSession)).toBe(true);

    // First reset, same second.
    const link1 = await requestLink(ips[0]);
    const r1 = await reset(link1, 'First-strong-pass-1', ips[0]);
    expect(r1.status).toBe(200);
    const session1 = r1.cookies.get('auth_token')?.value ?? '';
    expect(session1).not.toBe('');

    // 1. The session minted before the reset, in the same second, has ended.
    expect(await accepted(oldSession)).toBe(false);
    expect(await refreshStatus(oldSession)).toBe(401);
    expect(await accepted(session1)).toBe(true);

    // 2. A new link requested after the reset, still the same second, works once.
    const link2 = await requestLink(ips[1]);
    const r2 = await reset(link2, 'Second-strong-pass-2', ips[1]);
    expect(r2.status).toBe(200);
    expect((await reset(link2, 'Third-strong-pass-3', ips[2])).status).toBe(400);
    const session2 = r2.cookies.get('auth_token')?.value ?? '';
    expect(await accepted(session1)).toBe(false);
    expect(await accepted(session2)).toBe(true);

    // 3. Signing in with the new password, same second, gives an accepted session.
    const login = await lmsAuth.authenticateWithPassword(email, 'Second-strong-pass-2');
    expect(login).not.toBeNull();
    expect(await accepted(await jwt.signSessionToken(login!))).toBe(true);
  });
});
