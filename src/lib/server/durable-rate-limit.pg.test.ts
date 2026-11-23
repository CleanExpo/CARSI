/**
 * GP-760 (c): the auth rate limit is held in Postgres, so it is shared by every instance and is
 * not reset by a deploy, on a REAL PostgreSQL.
 *
 * A "deploy" or a second instance is a fresh copy of the module (vi.resetModules), whose
 * in-process memory starts empty. The count must carry over. Concurrent calls must not lose
 * counts. An ended window starts again at 1. The key is never stored in clear.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. It
 * needs a disposable loopback database (src/test-utils/pg-disposable.ts); locally it skips.
 */
import { createHash, randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('GP-760 durable auth rate limit (real PostgreSQL)', () => {
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

type Limiter = typeof import('@/lib/server/durable-rate-limit').applyDurableRateLimit;

describe.runIf(RUNNABLE)('GP-760 durable auth rate limit (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const keys: string[] = [];
  const opened: Array<{ $disconnect: () => Promise<void> }> = [];

  /** A fresh module graph: empty in-process limiter, as after a deploy or on another instance. */
  async function freshInstance(): Promise<Limiter> {
    vi.resetModules();
    const { prisma } = await import('@/lib/prisma');
    opened.push(prisma);
    return (await import('@/lib/server/durable-rate-limit')).applyDurableRateLimit;
  }

  const hashed = (k: string) => createHash('sha256').update(k).digest('hex');

  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db
      .query('DELETE FROM auth_rate_limits WHERE key = ANY($1::text[])', [keys.map(hashed)])
      .catch(() => {});
    for (const p of opened) await p.$disconnect().catch(() => {});
    await db.end().catch(() => {});
  });

  it('keeps the count across a deploy and between instances, and refuses over the limit', async () => {
    const key = `auth-reset-pw-ip:198.51.100.${run}`;
    keys.push(key);
    const limit = 3;
    const windowMs = 15 * 60 * 1000;

    const first = await freshInstance();
    expect((await first(key, limit, windowMs)).ok).toBe(true);
    expect((await first(key, limit, windowMs)).ok).toBe(true);

    // "Deploy": new process memory. The third call is still within the limit, the fourth is not.
    const afterDeploy = await freshInstance();
    expect((await afterDeploy(key, limit, windowMs)).ok).toBe(true);
    const over = await afterDeploy(key, limit, windowMs);
    expect(over.ok).toBe(false);
    expect(over.resetAt).toBeGreaterThan(Date.now());

    // Another instance sees the same exhausted window.
    const other = await freshInstance();
    expect((await other(key, limit, windowMs)).ok).toBe(false);

    // Stored hashed, never in clear.
    const stored = await db.query('SELECT key, count FROM auth_rate_limits WHERE key = $1', [
      hashed(key),
    ]);
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0].count).toBe(5);
    const clear = await db.query('SELECT 1 FROM auth_rate_limits WHERE key = $1', [key]);
    expect(clear.rows).toHaveLength(0);
  });

  it('counts every concurrent call exactly once', async () => {
    const key = `auth-login:203.0.113.${run}`;
    keys.push(key);
    const limiter = await freshInstance();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => limiter(key, 5, 15 * 60 * 1000))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    const stored = await db.query('SELECT count FROM auth_rate_limits WHERE key = $1', [
      hashed(key),
    ]);
    expect(stored.rows[0].count).toBe(12);
  });

  it('starts a new window at 1 once the old window has ended', async () => {
    const key = `auth-refresh:${run}`;
    keys.push(key);
    const limiter = await freshInstance();
    for (let i = 0; i < 3; i += 1) await limiter(key, 2, 15 * 60 * 1000);
    expect((await limiter(key, 2, 15 * 60 * 1000)).ok).toBe(false);

    await db.query("UPDATE auth_rate_limits SET reset_at = now() - interval '1 second' WHERE key = $1", [
      hashed(key),
    ]);
    const next = await limiter(key, 2, 15 * 60 * 1000);
    expect(next.ok).toBe(true);
    expect(next.remaining).toBe(1);
  });
});
