/**
 * GET /api/admin/reviews/summary (spec D13; release-gate r7-r9): the moderation summary shows
 * hidden reviews by reason and rating, so only a CURRENT admin may read it — re-validated from
 * the database with session provenance — and the summary is read inside that same transaction,
 * after the re-validation, never as a separate read.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type LmsRow = { id: string; is_active: boolean; role: string | null };

const m = vi.hoisted(() => ({
  session: vi.fn(),
  lmsRows: new Map<string, LmsRow>(),
  adminRows: new Map<string, { id: string; is_active: boolean; role: string }>(),
  inTx: false,
  ops: [] as string[],
  summaryDb: [] as unknown[],
}));

vi.mock('@/lib/server/review-admin-session', () => ({ readReviewAdminSession: m.session }));
vi.mock('@/lib/prisma', () => {
  const client = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      m.ops.push(`${m.inTx ? 'TX:' : ''}auth`);
      if (sql.includes('"admin_users"')) {
        const row = m.adminRows.get(String(values[0]));
        return row ? [row] : [];
      }
      if (sql.includes('"lms_user_roles"')) return [];
      if (sql.includes('"lms_users"')) {
        const hit = [...m.lmsRows].find(([, row]) => row.id === String(values[0]));
        return hit ? [{ ...hit[1], email: hit[0] }] : [];
      }
      throw new Error(`unexpected SQL ${sql}`);
    },
    $transaction: async (fn: (tx: unknown) => unknown) => {
      m.inTx = true;
      try {
        return await fn(client);
      } finally {
        m.inTx = false;
      }
    },
  };
  return { prisma: client };
});
vi.mock('@/lib/server/review-summary', () => ({
  getReviewFunnelSummary: async (db: unknown) => {
    m.ops.push(`${m.inTx ? 'TX:' : ''}summary`);
    m.summaryDb.push(db);
    return { hides_by_reason_and_rating: [{ reason: 'spam_or_fake', rating: 1, count: 1 }] };
  },
}));

const { GET } = await import('../../../app/api/admin/reviews/summary/route');
const SAVED = {
  db: process.env.DATABASE_URL,
  admin: process.env.ADMIN_EMAIL,
  panel: process.env.ADMIN_PANEL_EMAILS,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_EMAIL = 'founder@carsi.com.au';
  delete process.env.ADMIN_PANEL_EMAILS;
  m.lmsRows = new Map();
  m.adminRows = new Map([['ops@carsi.com.au', { id: 'adm-7', is_active: true, role: 'admin' }]]);
  m.ops = [];
  m.summaryDb = [];
  m.inTx = false;
});
afterAll(() => {
  for (const [k, v] of [
    ['DATABASE_URL', SAVED.db],
    ['ADMIN_EMAIL', SAVED.admin],
    ['ADMIN_PANEL_EMAILS', SAVED.panel],
  ] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('admin review summary', () => {
  it('no session → 401; no database → 503', async () => {
    m.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    m.session.mockResolvedValue({ via: 'admin_cookie', email: 'ops@carsi.com.au' });
    delete process.env.DATABASE_URL;
    expect((await GET()).status).toBe(503);
  });

  it.each([
    [
      'the bootstrap admin (admin cookie)',
      { via: 'admin_cookie', email: 'founder@carsi.com.au' },
      {},
    ],
    [
      'an active admin_users admin (admin cookie)',
      { via: 'admin_cookie', email: 'ops@carsi.com.au' },
      {},
    ],
    [
      'an LMS user whose current database role is admin',
      { via: 'lms_session', userId: 'lms-3', email: 'a@carsi.com.au' },
      { 'a@carsi.com.au': { id: 'lms-3', is_active: true, role: 'admin' } },
    ],
  ])('serves %s', async (_label, session, users) => {
    m.session.mockResolvedValue(session);
    for (const [k, v] of Object.entries(users as Record<string, LmsRow>)) m.lmsRows.set(k, v);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).hides_by_reason_and_rating).toHaveLength(1);
  });

  it.each([
    [
      'a demoted LMS admin with an old token',
      { via: 'lms_session', userId: 'lms-9', email: 'ex@carsi.com.au' },
      { 'ex@carsi.com.au': { id: 'lms-9', is_active: true, role: 'student' } },
    ],
    [
      'a deactivated LMS admin',
      { via: 'lms_session', userId: 'lms-9', email: 'ex@carsi.com.au' },
      { 'ex@carsi.com.au': { id: 'lms-9', is_active: false, role: 'admin' } },
    ],
    [
      'an LMS account self-registered with the ADMIN_EMAIL address',
      { via: 'lms_session', userId: 'lms-x', email: 'founder@carsi.com.au' },
      { 'founder@carsi.com.au': { id: 'lms-x', is_active: true, role: 'student' } },
    ],
    [
      'an admin cookie for a non-admin address',
      { via: 'admin_cookie', email: 'nobody@carsi.com.au' },
      {},
    ],
  ])('refuses %s (403, nothing private read)', async (_label, session, users) => {
    m.session.mockResolvedValue(session);
    for (const [k, v] of Object.entries(users as Record<string, LmsRow>)) m.lmsRows.set(k, v);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty('hides_by_reason_and_rating');
    expect(m.ops.some((o) => o.endsWith('summary'))).toBe(false);
  });

  it('r9: the summary is read inside the re-validation transaction, after it, on that transaction', async () => {
    m.session.mockResolvedValue({ via: 'admin_cookie', email: 'ops@carsi.com.au' });
    await GET();
    expect(m.ops).toEqual(['TX:auth', 'TX:summary']);
    expect(m.summaryDb).toHaveLength(1);
    expect(m.summaryDb[0]).toBeDefined();
  });
});
