/**
 * The review-request switch route (spec D10d, D10e; release-gate r5, r6): admin only, validates its
 * input, fails visibly without a database, RE-VALIDATES the admin from the database on every
 * request inside the switch transaction (never from token claims alone), refuses changes that no
 * currently authorised admin can be attributed to, and appends every change to an audit history
 * in the same transaction as the change, under a row lock.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type AdminRow = { id: string; is_active: boolean; role: string };
type LmsRow = { id: string; is_active: boolean; role: string | null };

const m = vi.hoisted(() => ({
  session: vi.fn(),
  adminRows: new Map<string, AdminRow>(),
  lmsRows: new Map<string, LmsRow>(),
  /** lms_user_roles names by lms_users.id (these win over the column, as at login). */
  roleRows: new Map<string, string[]>(),
  settings: { enabled: false } as { enabled: boolean },
  events: [] as Array<Record<string, unknown>>,
  inTx: false,
  sql: [] as string[],
  failEventWrite: false,
  /** Makes the next switch transaction's lock wait time out (SQLSTATE 55P03, as adapter-pg reports it). */
  lockTimeoutOnce: false,
  /** The options the switch transaction was opened with. */
  txOptions: [] as unknown[],
}));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: m.session }));
vi.mock('@/lib/server/review-summary', () => ({ getReviewFunnelSummary: async () => ({ hidden_by_reason: { spam_or_fake: 1 } }) }));
vi.mock('@/lib/prisma', () => {
  const client = {
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
    $executeRawUnsafe: async (sql: string) => {
      m.sql.push(`${m.inTx ? 'TX:' : ''}${sql}`);
      return 0;
    },
    $executeRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      m.sql.push(`${m.inTx ? 'TX:' : ''}${sql}`);
      if (m.lockTimeoutOnce && sql.includes('pg_advisory_xact_lock')) {
        m.lockTimeoutOnce = false;
        throw Object.assign(new Error('Raw query failed'), {
          code: 'P2010',
          meta: { driverAdapterError: { cause: { originalCode: '55P03', originalMessage: 'canceling statement due to lock timeout' } } },
        });
      }
      return 1;
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      m.sql.push(`${m.inTx ? 'TX:' : ''}${sql}`);
      if (sql.includes('"lms_review_request_settings"')) {
        if (!m.inTx) throw new Error('switch row read outside the switch transaction');
        return [{ enabled: m.settings.enabled }];
      }
      if (sql.includes('"lms_user_roles"')) return (m.roleRows.get(String(values[0])) ?? []).map((name) => ({ name }));
      const email = String(values[0]);
      if (sql.includes('"admin_users"')) return m.adminRows.has(email) ? [m.adminRows.get(email)] : [];
      if (sql.includes('"lms_users"')) return m.lmsRows.has(email) ? [m.lmsRows.get(email)] : [];
      throw new Error(`unexpected SQL ${sql}`);
    },
    // All-or-nothing, like a real transaction: a failure rolls the switch back.
    $transaction: async (fn: (tx: unknown) => unknown, options?: unknown) => {
      m.txOptions.push(options);
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
const { GET: summaryGET } = await import('../../../app/api/admin/reviews/summary/route');
const SAVED_ENV = { db: process.env.DATABASE_URL, admin: process.env.ADMIN_EMAIL, panel: process.env.ADMIN_PANEL_EMAILS };

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/admin/reviews/email-settings', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_EMAIL = 'Founder@CARSI.com.au';
  delete process.env.ADMIN_PANEL_EMAILS;
  m.settings = { enabled: false };
  m.events = [];
  m.sql = [];
  m.failEventWrite = false;
  m.lockTimeoutOnce = false;
  m.txOptions = [];
  m.adminRows = new Map([['ops@carsi.com.au', { id: 'adm-7', is_active: true, role: 'admin' }]]);
  m.lmsRows = new Map();
  m.roleRows = new Map();
  m.session.mockResolvedValue({ email: 'ops@carsi.com.au' });
});
afterAll(() => {
  for (const [k, v] of [['DATABASE_URL', SAVED_ENV.db], ['ADMIN_EMAIL', SAVED_ENV.admin], ['ADMIN_PANEL_EMAILS', SAVED_ENV.panel]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
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
    ['bootstrap ADMIN_EMAIL', 'founder@carsi.com.au', {}, {}, { actorKind: 'bootstrap_admin', actorRef: null }],
    ['active admin_users account', 'ops@carsi.com.au', {}, {}, { actorKind: 'admin_user', actorRef: 'adm-7' }],
    ['active admin-role LMS user', 'lms.admin@carsi.com.au', {}, { 'lms.admin@carsi.com.au': { id: 'lms-3', is_active: true, role: 'admin' } }, { actorKind: 'lms_admin', actorRef: 'lms-3' }],
    ['active allow-listed LMS user (founder)', 'phill.m@carsi.com.au', {}, { 'phill.m@carsi.com.au': { id: 'lms-1', is_active: true, role: 'student' } }, { actorKind: 'lms_admin', actorRef: 'lms-1' }],
  ])('attributes a change by the %s', async (_label, email, admins, users, expected) => {
    m.session.mockResolvedValue({ email });
    for (const [k, v] of Object.entries(admins as Record<string, AdminRow>)) m.adminRows.set(k, v);
    for (const [k, v] of Object.entries(users as Record<string, LmsRow>)) m.lmsRows.set(k, v);
    const res = await post({ enabled: true });
    expect(res.status).toBe(200);
    expect(m.events).toEqual([{ oldEnabled: false, newEnabled: true, actorEmail: email.toLowerCase(), ...expected }]);
  });

  it.each([
    ['r6 reviewer case: token still says admin, but the LMS user is now inactive and a student', { 'ex@carsi.com.au': { id: 'lms-9', is_active: false, role: 'student' } }, {}],
    ['LMS user deactivated but still role admin', { 'ex@carsi.com.au': { id: 'lms-9', is_active: false, role: 'admin' } }, {}],
    ['LMS user active but demoted to student and not allow-listed', { 'ex@carsi.com.au': { id: 'lms-9', is_active: true, role: 'student' } }, {}],
    ['admin_users account deactivated', {}, { 'ex@carsi.com.au': { id: 'adm-9', is_active: false, role: 'admin' } }],
    ['admin_users account with a non-admin role', {}, { 'ex@carsi.com.au': { id: 'adm-9', is_active: true, role: 'viewer' } }],
    ['token only: no current account at all', {}, {}],
  ])('refuses: %s — nothing changes', async (_label, users, admins) => {
    m.session.mockResolvedValue({ email: 'ex@carsi.com.au' });
    for (const [k, v] of Object.entries(users as Record<string, LmsRow>)) m.lmsRows.set(k, v);
    for (const [k, v] of Object.entries(admins as Record<string, AdminRow>)) m.adminRows.set(k, v);
    const res = await post({ enabled: true });
    expect(res.status).toBe(403);
    expect(m.settings.enabled).toBe(false);
    expect(m.events).toHaveLength(0);
  });

  it('r7: demoted by removing the admin role row (column still says admin) → refused', async () => {
    m.session.mockResolvedValue({ email: 'ex@carsi.com.au' });
    m.lmsRows.set('ex@carsi.com.au', { id: 'lms-9', is_active: true, role: 'admin' });
    m.roleRows.set('lms-9', ['student']);
    expect((await post({ enabled: true })).status).toBe(403);
    expect(m.events).toHaveLength(0);
    expect(m.sql.some((q) => /^TX:[\s\S]*FROM "lms_user_roles"[\s\S]*FOR SHARE OF ur/.test(q))).toBe(true);
  });

  it('r7: an admin by role row (column says student) is accepted, as at login', async () => {
    m.session.mockResolvedValue({ email: 'role.admin@carsi.com.au' });
    m.lmsRows.set('role.admin@carsi.com.au', { id: 'lms-4', is_active: true, role: 'student' });
    m.roleRows.set('lms-4', ['admin']);
    expect((await post({ enabled: true })).status).toBe(200);
    expect(m.events[0]).toMatchObject({ actorKind: 'lms_admin', actorRef: 'lms-4' });
  });

  it('r7: the moderation summary (hidden reviews by reason) is refused for a demoted admin, served to a current one', async () => {
    m.session.mockResolvedValue({ email: 'ex@carsi.com.au' });
    m.lmsRows.set('ex@carsi.com.au', { id: 'lms-9', is_active: true, role: 'student' });
    const refused = await summaryGET();
    expect(refused.status).toBe(403);
    expect(await refused.json()).not.toHaveProperty('hidden_by_reason');
    m.session.mockResolvedValue({ email: 'ops@carsi.com.au' });
    expect((await summaryGET()).status).toBe(200);
  });

  it('identity rows are re-read FOR SHARE inside the switch transaction', async () => {
    await post({ enabled: true });
    expect(m.sql.some((q) => /^TX:\s*SELECT "id", "is_active", "role" FROM "admin_users" WHERE lower\("email"\) = \? FOR SHARE/.test(q))).toBe(true);
  });

  it('r7: the switch transaction outlasts the longest send (never Prisma\'s 5 s default)', async () => {
    const { REVIEW_REQUEST_SEND_TRANSACTION_TIMEOUT_MS, REVIEW_REQUEST_SEND_LOCK_TIMEOUT_MS, REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS } =
      await import('./review-request-email');
    await post({ enabled: false });
    const opts = m.txOptions[0] as { timeout?: number } | undefined;
    const maxSendHold = REVIEW_REQUEST_SEND_TRANSACTION_TIMEOUT_MS + REVIEW_REQUEST_SEND_LOCK_TIMEOUT_MS;
    expect(REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS).toBeGreaterThan(maxSendHold);
    expect(opts?.timeout).toBeGreaterThan(REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS);
    // The waits are bounded inside the transaction, and the fair lock comes before the row lock.
    const tx = m.sql.filter((q) => q.startsWith('TX:'));
    expect(tx[0]).toBe(`TX:SET LOCAL lock_timeout = '${REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS}ms'`);
    expect(tx[1]).toMatch(/pg_advisory_xact_lock\(\?::int4, \?::int4\)/);
    expect(tx[2]).toMatch(/"lms_review_request_settings" WHERE "id" = 1 FOR UPDATE/);
  });

  it('r7: if a send outlasts the wait, 409 "waiting for an in-flight send" and nothing changes', async () => {
    m.lockTimeoutOnce = true;
    const res = await post({ enabled: false });
    expect(res.status).toBe(409);
    expect((await res.json()).detail).toMatch(/waiting for an in-flight review-request send/i);
    expect(m.events).toHaveLength(0);
    // The retry lands.
    m.settings = { enabled: true };
    expect((await post({ enabled: false })).status).toBe(200);
    expect(m.settings.enabled).toBe(false);
  });

  it.each([
    ['demoted LMS user, still active', { 'ex@carsi.com.au': { id: 'lms-9', is_active: true, role: 'student' } }],
    ['deactivated LMS admin', { 'ex@carsi.com.au': { id: 'lms-9', is_active: false, role: 'admin' } }],
  ])('r7: GET history is refused for a %s with an old admin token (shared helper)', async (_label, users) => {
    m.session.mockResolvedValue({ email: 'ex@carsi.com.au' });
    for (const [k, v] of Object.entries(users as Record<string, LmsRow>)) m.lmsRows.set(k, v);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty('history');
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
