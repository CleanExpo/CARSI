/**
 * The review-request switch route (spec D10d): admin only, validates its input, fails visibly
 * without a database, and records who switched it and when.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ session: vi.fn(), userFind: vi.fn(), settingsFind: vi.fn(), settingsUpdate: vi.fn() }));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: m.session }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: m.userFind },
    lmsReviewRequestSettings: { findUnique: m.settingsFind, update: m.settingsUpdate },
  },
}));

const { GET, POST } = await import('../../../app/api/admin/reviews/email-settings/route');
const ORIGINAL_DB = process.env.DATABASE_URL;

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/admin/reviews/email-settings', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test';
  m.session.mockResolvedValue({ email: 'admin@carsi.com.au' });
  m.userFind.mockResolvedValue({ id: 'admin-1' });
  m.settingsFind.mockResolvedValue({ enabled: false });
  m.settingsUpdate.mockImplementation(async ({ data }: { data: { enabled: boolean; changedAt: Date } }) => ({
    enabled: data.enabled,
    changedAt: data.changedAt,
  }));
});
afterAll(() => {
  process.env.DATABASE_URL = ORIGINAL_DB;
});

describe('review-request email switch', () => {
  it('refuses anyone who is not an admin', async () => {
    m.session.mockResolvedValue(null);
    expect((await post({ enabled: true })).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(m.settingsUpdate).not.toHaveBeenCalled();
  });

  it('requires a boolean', async () => {
    expect((await post({ enabled: 'yes' })).status).toBe(400);
    expect(m.settingsUpdate).not.toHaveBeenCalled();
  });

  it('fails visibly without a database', async () => {
    delete process.env.DATABASE_URL;
    const res = await post({ enabled: true });
    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty('enabled');
  });

  it('switching records who and when', async () => {
    const res = await post({ enabled: true });
    expect(res.status).toBe(200);
    expect((await res.json()).enabled).toBe(true);
    const call = m.settingsUpdate.mock.calls[0]![0];
    expect(call.where).toEqual({ id: 1 });
    expect(call.data).toMatchObject({ enabled: true, changedById: 'admin-1' });
    expect(call.data.changedAt).toBeInstanceOf(Date);
  });

  it('reports the current switch state', async () => {
    m.settingsFind.mockResolvedValue({ enabled: true });
    expect(await (await GET()).json()).toEqual({ enabled: true, settings_missing: false });
  });
});
