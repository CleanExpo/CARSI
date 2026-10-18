/**
 * The review-request switch route (spec D10d, D10e; release-gate r5): admin only, validates its
 * input, fails visibly without a database, attributes every change to a verified admin identity
 * (bootstrap ADMIN_EMAIL, an admin_users account, or an allow-listed / admin-role LMS user),
 * refuses unattributable changes, and appends each change to an audit history in the same
 * transaction as the change, under a row lock.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  session: vi.fn(),
  adminUserFind: vi.fn(),
  lmsUserFind: vi.fn(),
  settings: { enabled: false } as { enabled: boolean },
  events: [] as Array<Record<string, unknown>>,
  inTx: false,
  sql: [] as string[],
  failEventWrite: false,
}));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: m.session }));
vi.mock('@/lib/admin/admin-panel-access', () => ({ getAdminEmail: () => 'Founder@CARSI.com.au' }));
vi.mock('@/lib/prisma', () => {
  const client = {
    adminUser: { findUnique: m.adminUserFind },
    lmsUser: { findFirst: m.lmsUserFind },
    lmsReviewRequestSettings: {
      findUnique: async () => ({ enabled: m.settings.enabled }),
      update: async ({ data }: { data: { enabled: boolean } }) => {
        if (!m.inTx) throw new Error('switch updated outside the audit transaction');
        m.settings = { ...m.settings, ...data };
        return m.settings;
      },
    },
    lmsReviewRequestSwitchEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (!m.inTx) throw new Error('history written outside the switch transaction');
        if (m.failEventWrite) throw new Error('disk full');
        m.events.push(data);
        return { createdAt: new Date('2026-10-18T10:00:00.000Z') };
      },
      findMany: async () =>
        [...m.events].reverse().map((e) => ({ ...e, createdAt: new Date('2026-10-18T10:00:00.000Z') })),
    },
    $queryRaw: async (strings: TemplateStringsArray) => {
      m.sql.push(strings.join('?'));
      return [{ enabled: m.settings.enabled }];
    },
    // All-or-nothing, like a real transaction: a failure rolls the switch back.
    $transaction: async (fn: (tx: unknown) => unknown) => {
      const before = { ...m.settings };
      const eventsBefore = m.events.length;
      m.inTx = true;
      try {
        return await fn(client);
      } catch (e) {
        m.settings = before;
        m.events.length = eventsBefore;
        throw e;
      } finally {
        m.inTx = false;
      }
    },
  };
  return { prisma: client };
});

const { GET, POST } = await import('../../../app/api/admin/reviews/email-settings/route');
const ORIGINAL_DB = process.env.DATABASE_URL;

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/admin/reviews/email-settings', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test';
  m.settings = { enabled: false };
  m.events = [];
  m.sql = [];
  m.failEventWrite = false;
  m.session.mockResolvedValue({ email: 'ops@carsi.com.au' });
  m.adminUserFind.mockResolvedValue({ id: 'adm-7', isActive: true });
  m.lmsUserFind.mockResolvedValue(null);
});
afterAll(() => {
  process.env.DATABASE_URL = ORIGINAL_DB;
});

describe('review-request email switch', () => {
  it('refuses anyone who is not an admin', async () => {
    m.session.mockResolvedValue(null);
    expect((await post({ enabled: true })).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(m.events).toHaveLength(0);
  });

  it('requires a boolean', async () => {
    expect((await post({ enabled: 'yes' })).status).toBe(400);
    expect(m.events).toHaveLength(0);
  });

  it('fails visibly without a database', async () => {
    delete process.env.DATABASE_URL;
    const res = await post({ enabled: true });
    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty('enabled');
  });

  it.each([
    ['bootstrap ADMIN_EMAIL', 'founder@carsi.com.au', null, null, { actorKind: 'bootstrap_admin', actorRef: null }],
    ['admin_users account', 'ops@carsi.com.au', { id: 'adm-7', isActive: true }, null, { actorKind: 'admin_user', actorRef: 'adm-7' }],
    ['admin-role LMS user', 'lms.admin@carsi.com.au', null, { id: 'lms-3' }, { actorKind: 'lms_admin', actorRef: 'lms-3' }],
  ])('attributes a change by the %s', async (_label, email, adminRow, lmsRow, expected) => {
    m.session.mockResolvedValue({ email });
    m.adminUserFind.mockResolvedValue(adminRow);
    m.lmsUserFind.mockResolvedValue(lmsRow);
    const res = await post({ enabled: true });
    expect(res.status).toBe(200);
    expect(m.events).toEqual([{ oldEnabled: false, newEnabled: true, actorEmail: email.toLowerCase(), ...expected }]);
  });

  it('an inactive admin_users account with no other identity is unattributable: refused, nothing changes', async () => {
    m.session.mockResolvedValue({ email: 'gone@carsi.com.au' });
    m.adminUserFind.mockResolvedValue({ id: 'adm-9', isActive: false });
    m.lmsUserFind.mockResolvedValue(null);
    const res = await post({ enabled: true });
    expect(res.status).toBe(403);
    expect(m.settings.enabled).toBe(false);
    expect(m.events).toHaveLength(0);
  });

  it('every toggle is appended; earlier changes are never overwritten', async () => {
    await post({ enabled: true });
    m.session.mockResolvedValue({ email: 'founder@carsi.com.au' });
    await post({ enabled: false });
    expect(m.events.map((e) => [e.oldEnabled, e.newEnabled, e.actorEmail])).toEqual([
      [false, true, 'ops@carsi.com.au'],
      [true, false, 'founder@carsi.com.au'],
    ]);
    const body = await (await GET()).json();
    expect(body.history).toHaveLength(2);
    expect(body.history[0]).toMatchObject({ old_enabled: true, new_enabled: false, actor_email: 'founder@carsi.com.au' });
  });

  it('the switch row is locked FOR UPDATE inside the change transaction', async () => {
    await post({ enabled: true });
    expect(m.sql.some((q) => /FROM "lms_review_request_settings" WHERE "id" = 1 FOR UPDATE/.test(q))).toBe(true);
  });

  it('if the history cannot be written, the switch does not change (same transaction)', async () => {
    m.failEventWrite = true;
    const res = await post({ enabled: true });
    expect(res.status).toBe(500);
    expect(m.settings.enabled).toBe(false);
    expect(m.events).toHaveLength(0);
  });
});
