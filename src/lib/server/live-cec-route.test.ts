import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Contract test for /api/cron/live-cec-check.
 *
 * WHAT THIS IS REALLY GUARDING: the STATUS CODE, not a body field. The scheduled workflow
 * uses `curl --fail-with-body`, which fails on non-2xx and parses nothing. So a 200 carrying
 * `{ok:false}` on drift would render a licence violation as a green tick — the exact failure
 * class GP-519 was filed about. Every assertion below is on `res.status` for that reason.
 *
 * The route is exercised for real; only Prisma is faked, so the route's own branching, the
 * shared `runLiveCecCheck`, and the real approvals registry all participate.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsCourse: { findMany: mocks.findMany } },
}));

const { GET } = await import('../../../app/api/cron/live-cec-check/route');

const SECRET = 'test-cron-secret-value';

/** An approved slug taken from the SSOT itself, so this test cannot drift from the registry. */
function approvedEntry(): { slug: string; approvedHours: number } {
  const raw = readFileSync(join(process.cwd(), 'data/seed/cec-approvals.json'), 'utf8');
  const parsed = JSON.parse(raw) as {
    approvals: Array<{ slug: string; status: string; approvedHours: number }>;
  };
  const entry = parsed.approvals.find((a) => a.status === 'approved' && a.approvedHours > 0);
  if (!entry) throw new Error('registry has no approved entry — this test cannot be meaningful');
  return { slug: entry.slug, approvedHours: entry.approvedHours };
}

/** A slug that is deliberately NOT in the registry, so its approved target is 0. */
const UNAPPROVED_SLUG = 'zz-synthetic-course-never-approved-for-cec';

function req(token: string | null = SECRET): Request {
  return new Request('https://carsi.example.test/api/cron/live-cec-check', {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic/not-connected');
  mocks.findMany.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('live CEC guard route', () => {
  it('positive control: the fake Prisma is actually consulted', async () => {
    // Without this, every assertion below could be passing on an inert mock.
    mocks.findMany.mockResolvedValue([]);
    await GET(req());
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns 200 when every course matches the registry', async () => {
    mocks.findMany.mockResolvedValue([
      { slug: UNAPPROVED_SLUG, cecHours: 0 },
      { slug: 'another-unapproved-course', cecHours: null },
    ]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, scanned: 2 });
  });

  it('returns 409 — NOT 200 — when a course publishes unapproved CEC hours', async () => {
    // THE LOAD-BEARING ASSERTION. 409 is what makes `curl --fail-with-body` turn the nightly
    // job red. If this ever becomes a 2xx, the guard silently stops guarding.
    mocks.findMany.mockResolvedValue([{ slug: UNAPPROVED_SLUG, cecHours: 8 }]);
    const res = await GET(req());
    expect(res.status).toBe(409);

    const body = (await res.json()) as { ok: boolean; unapproved: Array<{ slug: string }>; detail: string[] };
    expect(body.ok).toBe(false);
    expect(body.unapproved.map((u) => u.slug)).toContain(UNAPPROVED_SLUG);
    // The offending slug must be in the body, or the red CI log is unactionable.
    expect(body.detail.join(' ')).toContain(UNAPPROVED_SLUG);
  });

  it('returns 409 when an APPROVED course shows the wrong hours (under-crediting)', async () => {
    const { slug, approvedHours } = approvedEntry();
    mocks.findMany.mockResolvedValue([{ slug, cecHours: approvedHours + 3 }]);
    const res = await GET(req());
    expect(res.status).toBe(409);
    const body = (await res.json()) as { wrongHours: Array<{ slug: string; target: number }> };
    expect(body.wrongHours.map((w) => w.slug)).toContain(slug);
  });

  it('returns 500 when the database read throws — never a pass', async () => {
    // A read that failed must not render as a read that succeeded and found nothing.
    mocks.findMany.mockRejectedValue(new Error('P1008 SocketTimeout'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'check_failed' });
  });

  it('returns 500 when DATABASE_URL is unset — a guard that cannot run has not passed', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const res = await GET(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'no_database' });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('returns 401 without a valid bearer token', async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await GET(req(null))).status).toBe(401);
    expect((await GET(req('wrong-secret'))).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    mocks.findMany.mockResolvedValue([]);
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('every non-clean outcome is non-2xx, so curl --fail catches all of them', async () => {
    // Property form of the checks above: enumerate the bad outcomes and assert none is 2xx.
    // Guards against someone "helpfully" softening one status to 200 later.
    const outcomes: Array<[string, () => void, Request]> = [
      ['drift', () => mocks.findMany.mockResolvedValue([{ slug: UNAPPROVED_SLUG, cecHours: 4 }]), req()],
      ['throw', () => mocks.findMany.mockRejectedValue(new Error('boom')), req()],
      ['unauthorised', () => mocks.findMany.mockResolvedValue([]), req('nope')],
    ];
    for (const [label, arrange, request] of outcomes) {
      mocks.findMany.mockReset();
      arrange();
      const res = await GET(request);
      expect(res.status, `${label} must not be 2xx`).not.toBeLessThan(300);
    }
  });
});
