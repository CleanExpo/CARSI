import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS2 (P0-B) AC-6 — the health check must verify a REAL dependency.
 *
 * DigitalOcean's probe hits /api/health, which was a static always-200 that
 * verified nothing — so a deploy with a dead DB or a missing AI key passed the
 * gate. computeHealth returns 503 unless BOTH the DB probe and the AI config
 * pass; probeDatabase maps any DB error to `false` (never throws).
 */

const mock = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mock.queryRaw } }));

import { computeHealth, probeDatabase, getHealth } from './health';

beforeEach(() => {
  mock.queryRaw.mockReset();
});

describe('computeHealth', () => {
  it('is healthy (200) only when both DB and AI are ok', () => {
    const r = computeHealth({ dbOk: true, aiConfigured: true });
    expect(r.status).toBe('healthy');
    expect(r.httpStatus).toBe(200);
    expect(r.checks).toEqual({ db: true, ai: true });
  });

  it('is unhealthy (503) when the DB is down', () => {
    const r = computeHealth({ dbOk: false, aiConfigured: true });
    expect(r.status).toBe('unhealthy');
    expect(r.httpStatus).toBe(503);
  });

  it('is unhealthy (503) when the AI key is unset', () => {
    expect(computeHealth({ dbOk: true, aiConfigured: false }).httpStatus).toBe(503);
  });

  it('is unhealthy (503) when both fail', () => {
    expect(computeHealth({ dbOk: false, aiConfigured: false }).httpStatus).toBe(503);
  });
});

describe('probeDatabase', () => {
  it('returns true when SELECT 1 succeeds', async () => {
    mock.queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    expect(await probeDatabase()).toBe(true);
  });

  it('returns false (never throws) when the query fails', async () => {
    mock.queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    expect(await probeDatabase()).toBe(false);
  });
});

describe('getHealth', () => {
  it('returns 200 when the DB probe passes and the AI key is set', async () => {
    mock.queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    const r = await getHealth({ OPENROUTER_API_KEY: 'sk-or-x' });
    expect(r.httpStatus).toBe(200);
  });

  it('returns 503 when the DB probe fails even if the AI key is set', async () => {
    mock.queryRaw.mockRejectedValueOnce(new Error('down'));
    const r = await getHealth({ OPENROUTER_API_KEY: 'sk-or-x' });
    expect(r.httpStatus).toBe(503);
    expect(r.checks.db).toBe(false);
  });

  it('returns 503 when the AI key is unset even if the DB is up', async () => {
    mock.queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    const r = await getHealth({});
    expect(r.httpStatus).toBe(503);
    expect(r.checks.ai).toBe(false);
  });
});
