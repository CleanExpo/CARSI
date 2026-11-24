import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The legacy admin cookie must follow the admin_users row's role NOW, the same rule
 * resolveCurrentAdmin (src/lib/server/current-admin.ts) applies: an active row with role 'admin'.
 * An active row whose role is anything else (a demoted account) is refused, so it cannot reach
 * the admin layout, any page that re-checks getAdminSessionOrNull (such as /admin/retention), or
 * any /api/admin route, for the rest of its one-day cookie.
 *
 * Real token signing and the real verifier; only the admin_users lookup is stubbed.
 */

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}));

const row = vi.hoisted(() => ({
  current: null as null | { isActive: boolean; role: string },
  fail: false,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(async () => {
        if (row.fail) throw new Error('db down');
        return row.current ? { ...row.current } : null;
      }),
    },
  },
}));

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/admin/admin-auth';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

const EMAIL = 'former-admin@example.test';

beforeEach(() => {
  vi.stubEnv('ADMIN_EMAIL', 'bootstrap@example.test');
  jar.clear();
  row.current = null;
  row.fail = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('admin cookie follows the admin_users role now', () => {
  it('accepts an active row whose role is admin (positive control)', async () => {
    row.current = { isActive: true, role: 'admin' };
    const token = await createAdminSessionToken(EMAIL);
    expect(await verifyAdminSessionToken(token)).toEqual({ email: EMAIL });
    jar.set(ADMIN_COOKIE_NAME, token);
    expect(await getAdminSessionOrNull()).toEqual({ email: EMAIL });
  });

  it('accepts the role regardless of case and surrounding space, as resolveCurrentAdmin does', async () => {
    row.current = { isActive: true, role: ' Admin ' };
    const token = await createAdminSessionToken(EMAIL);
    expect(await verifyAdminSessionToken(token)).toEqual({ email: EMAIL });
  });

  it('refuses an active row demoted to another role', async () => {
    row.current = { isActive: true, role: 'student' };
    const token = await createAdminSessionToken(EMAIL);
    expect(await verifyAdminSessionToken(token)).toBeNull();
    jar.set(ADMIN_COOKIE_NAME, token);
    expect(await getAdminSessionOrNull()).toBeNull();
  });

  it('refuses an inactive admin row', async () => {
    row.current = { isActive: false, role: 'admin' };
    const token = await createAdminSessionToken(EMAIL);
    expect(await verifyAdminSessionToken(token)).toBeNull();
  });

  it('refuses when there is no row, and when the lookup fails', async () => {
    const token = await createAdminSessionToken(EMAIL);
    expect(await verifyAdminSessionToken(token)).toBeNull();
    row.fail = true;
    expect(await verifyAdminSessionToken(token)).toBeNull();
  });
});
