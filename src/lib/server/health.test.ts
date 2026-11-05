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

import { computeHealth, getLiveness, probeDatabase, getHealth } from './health';

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

  it('returns false when the query hangs past the timeout (never blocks the probe)', async () => {
    // A DB that accepts the connection but never answers must not stall the probe.
    let finish: (value: unknown) => void = () => {};
    mock.queryRaw.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    expect(await probeDatabase(20)).toBe(false);
    // Let the stalled query settle so the shared in-flight probe does not leak
    // into later tests.
    finish([{ ok: 1 }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('shares one in-flight SELECT 1 while the database is stalled (GP-693)', async () => {
    // A timed-out probe's query keeps holding a pool slot. Repeated health hits
    // during a stall must join that query, not open a new one each time.
    let finish: (value: unknown) => void = () => {};
    mock.queryRaw.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    mock.queryRaw.mockResolvedValue([{ ok: 1 }]);

    expect(await probeDatabase(10)).toBe(false);
    expect(await probeDatabase(10)).toBe(false);
    expect(await probeDatabase(10)).toBe(false);
    expect(mock.queryRaw).toHaveBeenCalledTimes(1);

    // Once the stalled query settles, the next probe runs a fresh one.
    finish([{ ok: 1 }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await probeDatabase(10)).toBe(true);
    expect(mock.queryRaw).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh query once a stalled probe is older than 30 seconds', async () => {
    // A query stuck on a half-open socket must not pin readiness at unhealthy for ever.
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let finish: (value: unknown) => void = () => {};
    mock.queryRaw.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    mock.queryRaw.mockResolvedValue([{ ok: 1 }]);
    try {
      expect(await probeDatabase(10)).toBe(false);
      clock.mockReturnValue(now + 29_999);
      expect(await probeDatabase(10)).toBe(false);
      expect(mock.queryRaw).toHaveBeenCalledTimes(1);
      clock.mockReturnValue(now + 30_000);
      expect(await probeDatabase(10)).toBe(true);
      expect(mock.queryRaw).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
      finish([{ ok: 1 }]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

  it('starts a fresh query after a failed one settles', async () => {
    mock.queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    mock.queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    expect(await probeDatabase()).toBe(false);
    expect(await probeDatabase()).toBe(true);
    expect(mock.queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe('getLiveness', () => {
  it('is 200 when the AI provider is configured — and never touches the DB', () => {
    const r = getLiveness({ OPENROUTER_API_KEY: 'sk-or-x' });
    expect(r.httpStatus).toBe(200);
    expect(r.status).toBe('healthy');
    expect(r.checks).toEqual({ ai: true });
    // Liveness must not depend on the DB — the prisma probe is never invoked here.
    expect(mock.queryRaw).not.toHaveBeenCalled();
  });

  it('is 503 when the AI key is unset', () => {
    const r = getLiveness({});
    expect(r.httpStatus).toBe(503);
    expect(r.checks.ai).toBe(false);
    expect(mock.queryRaw).not.toHaveBeenCalled();
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
