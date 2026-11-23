/**
 * GP-760 (b): a password-reset link works once, and a successful reset ends the user's other
 * sessions, on a REAL PostgreSQL through the real route handlers.
 *
 *   1. Two concurrent POST /api/auth/reset-password with the same link: exactly one succeeds.
 *   2. The same link a third time: refused.
 *   3. A session issued before the reset: refused by the request session reader, by
 *      /api/auth/me and by /api/auth/refresh. The session the reset issued: accepted.
 *   4. A second link issued before the reset: refused (every earlier link dies with the reset).
 *
 * The earlier session and links are signed by hand with no generation claim, as every token issued
 * before GP-760 was (generation 0). Same-second timing is covered by
 * auth-session-generation.pg.test.ts.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. It
 * needs a disposable loopback database (src/test-utils/pg-disposable.ts); locally it skips.
 */
import { createHash, randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('GP-760 single-use password reset (real PostgreSQL)', () => {
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

describe.runIf(RUNNABLE)('GP-760 single-use password reset (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const email = `reset-${run}@reset-walk.invalid`;
  // Every rate-limit key this walk creates, removed afterwards (stored as SHA-256 hex).
  const ips = ['198.51.100.71', '203.0.113.72', '192.0.2.10', '192.0.2.11'];
  const limitKeys = [...ips.map((ip) => `auth-reset-pw-ip:${ip}`), `auth-refresh:${userId}`].map(
    (k) => createHash('sha256').update(k).digest('hex')
  );

  let resetPOST: typeof import('../../../app/api/auth/reset-password/route').POST;
  let refreshPOST: typeof import('../../../app/api/auth/refresh/route').POST;
  let meGET: typeof import('../../../app/api/auth/me/route').GET;
  let getSessionClaimsFromRequest: typeof import('@/lib/server/auth-from-request').getSessionClaimsFromRequest;
  let secret: Uint8Array;
  let prisma: typeof import('@/lib/prisma').prisma;

  beforeAll(async () => {
    if (!process.env.JWT_SECRET?.trim()) {
      vi.stubEnv('JWT_SECRET', 'gp760-test-only-jwt-placeholder-0123456789abcdef');
    }
    await db.connect();
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password, full_name, is_active) VALUES ($1, $2, 'x', 'Reset Walk', true)",
      [userId, email]
    );
    ({ POST: resetPOST } = await import('../../../app/api/auth/reset-password/route'));
    ({ POST: refreshPOST } = await import('../../../app/api/auth/refresh/route'));
    ({ GET: meGET } = await import('../../../app/api/auth/me/route'));
    ({ getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request'));
    secret = (await import('@/lib/auth/jwt-secret')).getSessionSecretBytes();
    ({ prisma } = await import('@/lib/prisma'));
  });

  afterAll(async () => {
    await db.query('DELETE FROM lms_users WHERE id = $1', [userId]).catch(() => {});
    await db
      .query('DELETE FROM auth_rate_limits WHERE key = ANY($1::text[])', [limitKeys])
      .catch(() => {});
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
    vi.unstubAllEnvs();
  });

  const nowSec = () => Math.floor(Date.now() / 1000);

  function resetLink(iat: number) {
    return new SignJWT({ purpose: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(secret);
  }

  function session(iat: number) {
    return new SignJWT({ email, full_name: 'Reset Walk', role: 'student' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(iat)
      .setExpirationTime(iat + 7 * 86400)
      .sign(secret);
  }

  function resetRequest(token: string, ip: string) {
    return new NextRequest('https://carsi.example.test/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ token, new_password: 'A-strong-pass-9' }),
    });
  }

  function withSession(url: string, token: string, method = 'GET') {
    return new NextRequest(url, { method, headers: { cookie: `auth_token=${token}` } });
  }

  it('spends the link once, ends older sessions and older links, keeps the new session', async () => {
    const oldSession = await session(nowSec());
    const link = await resetLink(nowSec());
    const olderLink = await resetLink(nowSec());

    // Before the reset the old session is current.
    expect(
      await getSessionClaimsFromRequest(withSession('https://carsi.example.test/x', oldSession))
    ).not.toBeNull();

    // 1. Concurrent double submit: exactly one success.
    const [a, b] = await Promise.all([
      resetPOST(resetRequest(link, ips[0])),
      resetPOST(resetRequest(link, ips[1])),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 400]);
    const winner = a.status === 200 ? a : b;
    const newSession = winner.cookies.get('auth_token')?.value ?? '';
    expect(newSession).not.toBe('');

    // 2. Third use of the same link.
    const again = await resetPOST(resetRequest(link, ips[2]));
    expect(again.status).toBe(400);

    // 4. Another link issued before the reset (same generation).
    const older = await resetPOST(resetRequest(olderLink, ips[3]));
    expect(older.status).toBe(400);

    // 3. The old session is refused everywhere; the new one is accepted.
    expect(
      await getSessionClaimsFromRequest(withSession('https://carsi.example.test/x', oldSession))
    ).toBeNull();
    expect(
      await getSessionClaimsFromRequest(withSession('https://carsi.example.test/x', newSession))
    ).not.toBeNull();
    expect((await meGET(withSession('https://carsi.example.test/api/auth/me', oldSession))).status).toBe(401);
    expect((await meGET(withSession('https://carsi.example.test/api/auth/me', newSession))).status).toBe(200);
    expect(
      (await refreshPOST(withSession('https://carsi.example.test/api/auth/refresh', oldSession, 'POST')))
        .status
    ).toBe(401);
    expect(
      (await refreshPOST(withSession('https://carsi.example.test/api/auth/refresh', newSession, 'POST')))
        .status
    ).toBe(200);

    // The password and the verified flag were written once, by the winning request.
    const row = await db.query(
      'SELECT hashed_password, is_verified FROM lms_users WHERE id = $1',
      [userId]
    );
    expect(row.rows[0].hashed_password).not.toBe('x');
    expect(row.rows[0].is_verified).toBe(true);
  });
});
