/**
 * Session provenance for review-admin actions (release-gate r8 P1-BOOTSTRAP-LMS-IMPERSONATION, r10).
 * The ONE reader every review-admin route uses keeps which mechanism verified the session, so
 * resolveCurrentAdmin can refuse to treat a self-registered LMS account as the bootstrap admin just
 * because its email matches ADMIN_EMAIL — and can still recognise a real admin-cookie session.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  adminTokens: new Map<string, { email: string }>(),
  lmsClaims: null as null | { sub: string; email: string; role: string },
}));
vi.mock('@/lib/admin/admin-auth', () => ({
  ADMIN_COOKIE_NAME: 'admin_session',
  verifyAdminSessionToken: async (t: string) => m.adminTokens.get(t) ?? null,
}));
// The LMS side is the existing request reader (Bearer or cookies, plus its active-account check).
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => m.lmsClaims,
}));

const { readReviewAdminSession } = await import('./review-admin-session');
const SAVED = { admin: process.env.ADMIN_EMAIL, panel: process.env.ADMIN_PANEL_EMAILS };

const req = (cookie?: string) =>
  new NextRequest('http://localhost/api/x', cookie ? { headers: { cookie } } : undefined);

beforeEach(() => {
  m.adminTokens.clear();
  m.lmsClaims = null;
  process.env.ADMIN_EMAIL = 'support@carsi.com.au';
  delete process.env.ADMIN_PANEL_EMAILS;
});
afterAll(() => {
  for (const [k, v] of [
    ['ADMIN_EMAIL', SAVED.admin],
    ['ADMIN_PANEL_EMAILS', SAVED.panel],
  ] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('readReviewAdminSession keeps the verifying mechanism', () => {
  it('a valid admin cookie is an admin-cookie session', async () => {
    m.adminTokens.set('adm', { email: 'support@carsi.com.au' });
    expect(await readReviewAdminSession(req('admin_session=adm'))).toEqual({
      via: 'admin_cookie',
      email: 'support@carsi.com.au',
    });
  });

  it('r8 reviewer case: an LMS session for the ADMIN_EMAIL address is an LMS session (with its user id), never the admin cookie', async () => {
    m.lmsClaims = { sub: 'u-attacker', email: 'support@carsi.com.au', role: 'student' };
    expect(await readReviewAdminSession(req())).toEqual({
      via: 'lms_session',
      userId: 'u-attacker',
      email: 'support@carsi.com.au',
    });
  });

  it('an invalid admin cookie falls through to the LMS session, as getAdminSessionOrNull does', async () => {
    m.lmsClaims = { sub: 'u-1', email: 'a@b.com', role: 'admin' };
    expect(await readReviewAdminSession(req('admin_session=forged'))).toMatchObject({
      via: 'lms_session',
      userId: 'u-1',
    });
  });

  it('no valid session → null', async () => {
    expect(await readReviewAdminSession(req('admin_session=garbage'))).toBeNull();
  });
});
