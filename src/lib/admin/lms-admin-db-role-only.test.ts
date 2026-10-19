import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken, type SessionClaims } from '@/lib/auth/session-jwt';

/**
 * Founder decision 19/10/2026: LMS admin comes ONLY from the user's database role (the session
 * role minted by resolveSessionRole from lms_user_roles / lms_users.role). No email list, env var
 * or founder constant grants LMS admin on its own — an address registered before it was added to
 * a list would otherwise become admin (the residual limit recorded on PR #907).
 */

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { getDefaultAppPathForClaims, getPostLoginRedirectPath, isLmsClaimsAllowedAdminPanel } =
  await import('./admin-panel-access');
const { getAdminSessionOrNull } = await import('./admin-session');
const { GET: me } = await import('../../../app/api/auth/me/route');

const FOUNDER = 'phill.m@carsi.com.au';
const BOOTSTRAP = 'support@carsi.com.au';
const PANEL = 'ops@carsi.com.au';

function claims(email: string, role: string): SessionClaims {
  return { sub: '10000000-0000-4000-8000-000000000001', email, full_name: 'Test User', role };
}

async function lmsAdminView(c: SessionClaims) {
  const token = await signSessionToken(c);
  jar.clear();
  jar.set('auth_token', token);
  const session = await getAdminSessionOrNull();
  const res = await me(
    new NextRequest('http://localhost/api/auth/me', { headers: { cookie: `auth_token=${token}` } })
  );
  const body = (await res.json()) as { can_access_admin?: boolean };
  return {
    panel: isLmsClaimsAllowedAdminPanel(c),
    landing: getDefaultAppPathForClaims(c),
    redirect: getPostLoginRedirectPath(c, '/admin/courses'),
    session,
    canAccessAdmin: body.can_access_admin,
  };
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('ADMIN_EMAIL', BOOTSTRAP);
  vi.stubEnv('ADMIN_PANEL_EMAILS', `${PANEL}, extra@carsi.com.au`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  jar.clear();
});

describe('LMS admin is granted by the DB role only', () => {
  it.each([
    ['founder constant', FOUNDER],
    ['ADMIN_EMAIL', BOOTSTRAP],
    ['ADMIN_PANEL_EMAILS', PANEL],
    ['allowlisted address in odd case and spacing', '  OPS@Carsi.com.au '],
  ])('(a) an allowlisted email (%s) without DB role admin gets no LMS admin', async (_l, email) => {
    for (const role of ['student', 'instructor']) {
      const view = await lmsAdminView(claims(email, role));
      expect(view).toEqual({
        panel: false,
        landing: '/dashboard/student',
        redirect: '/dashboard/student',
        session: null,
        canAccessAdmin: false,
      });
    }
  });

  it.each([
    ['an address on no list', 'trainer@example.test'],
    ['the founder address', FOUNDER],
  ])('(b) a DB-role admin keeps LMS admin regardless of email (%s)', async (_l, email) => {
    const view = await lmsAdminView(claims(email, 'admin'));
    expect(view).toEqual({
      panel: true,
      landing: '/admin',
      redirect: '/admin/courses',
      session: { email },
      canAccessAdmin: true,
    });
  });

  it('(c) no consumer reads the email lists for an LMS-admin decision', () => {
    const root = join(__dirname, '..', '..', '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (p !== join(root, 'src', 'generated')) walk(p); // Prisma client output, not app code
        } else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
          files.push(p);
      }
    };
    walk(join(root, 'src'));
    walk(join(root, 'app'));
    const users = (re: RegExp) =>
      files
        .filter((f) => re.test(readFileSync(f, 'utf8')))
        .map((f) => relative(root, f))
        .sort();

    // The staff-email list exists only to REFUSE unverified account creation for those
    // addresses (PR #907). Its only readers are the definition and the two account-creation
    // paths; anything else reading it would be making a decision from an email list.
    expect(
      users(
        /\b(getReservedStaffEmails|isReservedStaffEmail|getAdminPanelAllowedEmails|isAdminAllowlistedEmail|FOUNDER_ADMIN_EMAILS|FOUNDER_EMAILS)\b/
      )
    ).toEqual([
      'src/lib/admin/admin-panel-access.ts',
      'src/lib/server/guest-checkout.ts',
      'src/lib/server/lms-auth.ts',
    ]);
    expect(users(/\bADMIN_PANEL_EMAILS\b/)).toEqual(['src/lib/admin/admin-panel-access.ts']);

    // ADMIN_EMAIL is read only as a notification recipient (contact, submit, enquiry,
    // transactional email), by the separate admin-password login (admin cookie: login route,
    // cookie verification, admin_users bootstrap) and by the reservation list's definition.
    expect(users(/\bADMIN_EMAIL\b|\bgetAdminEmail\b/)).toEqual([
      'app/api/admin/login/route.ts',
      'app/api/contact/route.ts',
      'app/api/submit/route.ts',
      'src/lib/admin/admin-auth.ts',
      'src/lib/admin/admin-panel-access.ts',
      'src/lib/admin/admin-store.ts',
      'src/lib/server/frontdesk/tools/capture-enquiry.ts',
      'src/lib/server/transactional-email.ts',
    ]);

    // The LMS-admin predicate itself reads the session role and nothing else.
    const src = readFileSync(join(root, 'src/lib/admin/admin-panel-access.ts'), 'utf8');
    const body = src.slice(src.indexOf('export function isLmsClaimsAllowedAdminPanel'));
    const fn = body.slice(0, body.indexOf('\n}\n') + 2);
    expect(fn).toMatch(/claims\.role/);
    expect(fn).not.toMatch(/email|Email|EMAIL|process\.env/);
  });
});
