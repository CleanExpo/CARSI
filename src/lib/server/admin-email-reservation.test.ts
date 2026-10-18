import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin self-registration takeover. `isLmsClaimsAllowedAdminPanel` grants the admin panel to
 * any LMS session whose email is on the allowlist (founder, ADMIN_EMAIL, ADMIN_PANEL_EMAILS),
 * and no account path verifies email ownership. So every unverified way to create or claim
 * an account must refuse an allowlisted address, or a stranger could register an unclaimed
 * admin address and become admin. Only the prisma boundary is mocked.
 */

type MockUser = {
  id: string;
  email: string;
  hashedPassword: string;
  fullName: string | null;
  isActive: boolean;
  isVerified: boolean;
  role: string | null;
};

const db = vi.hoisted(() => ({
  users: [] as MockUser[],
  roles: [{ id: 1, name: 'student' }] as { id: number; name: string }[],
  userRoles: [] as { userId: string; roleId: number }[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return db.users.find((u) => u.email === where.email) ?? null;
        if (where.id) return db.users.find((u) => u.id === where.id) ?? null;
        return null;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Partial<MockUser> & { id: string; email: string; hashedPassword: string };
        }) => {
          const user: MockUser = {
            fullName: null,
            isActive: true,
            isVerified: false,
            role: null,
            ...data,
          };
          db.users.push(user);
          return user;
        }
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
        const user = db.users.find((u) => u.id === where.id);
        if (!user) throw new Error('not found');
        Object.assign(user, data);
        return user;
      }),
    },
    lmsRole: {
      findUnique: vi.fn(
        async ({ where }: { where: { name: string } }) =>
          db.roles.find((r) => r.name === where.name) ?? null
      ),
    },
    lmsUserRole: {
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) =>
        db.userRoles
          .filter((ur) => ur.userId === where.userId)
          .map((ur) => ({ ...ur, role: db.roles.find((r) => r.id === ur.roleId) }))
      ),
      create: vi.fn(async ({ data }: { data: { userId: string; roleId: number } }) => {
        db.userRoles.push(data);
        return data;
      }),
    },
  },
}));

import {
  ensureGuestUserFromStripeEmail,
  findOrCreateGuestUser,
  isReservedGuestCheckoutEmail,
} from '@/lib/server/guest-checkout';
import { provisionalPasswordHash, registerUserWithPassword } from '@/lib/server/lms-auth';

const ORIG = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PANEL_EMAILS: process.env.ADMIN_PANEL_EMAILS,
};

beforeEach(() => {
  db.users = [];
  db.userRoles = [];
  process.env.ADMIN_EMAIL = 'support@carsi.com.au';
  process.env.ADMIN_PANEL_EMAILS = 'ops@carsi.com.au';
});

afterEach(() => {
  process.env.ADMIN_EMAIL = ORIG.ADMIN_EMAIL;
  process.env.ADMIN_PANEL_EMAILS = ORIG.ADMIN_PANEL_EMAILS;
});

// Founder, ADMIN_EMAIL and ADMIN_PANEL_EMAILS, in odd case and spacing.
const ADMIN_ADDRESSES = ['phill.m@carsi.com.au', '  Support@CARSI.com.au ', 'OPS@carsi.com.au'];

function pushUser(id: string, email: string, hashedPassword: string, role: string | null = null) {
  db.users.push({
    id,
    email,
    hashedPassword,
    fullName: null,
    isActive: true,
    isVerified: false,
    role,
  });
}

describe('unverified account paths refuse admin-allowlisted emails', () => {
  it.each(ADMIN_ADDRESSES)(
    'self-registration of %s is refused and writes nothing',
    async (email) => {
      const result = await registerUserWithPassword({
        email,
        password: 'attacker-pw-123',
        fullName: 'x',
      });
      expect(result).toEqual({ ok: false, code: 'EMAIL_TAKEN' });
      expect(db.users).toHaveLength(0);
    }
  );

  it('a JWT-sync placeholder row for an admin address cannot be claimed by registration', async () => {
    pushUser('ph-1', 'support@carsi.com.au', 'jwt:placeholder');
    const result = await registerUserWithPassword({
      email: 'support@carsi.com.au',
      password: 'attacker-pw-123',
      fullName: 'x',
    });
    expect(result).toEqual({ ok: false, code: 'EMAIL_TAKEN' });
    expect(db.users[0].hashedPassword).toBe('jwt:placeholder');
  });

  it.each(ADMIN_ADDRESSES)(
    'guest-free signup for %s mints no session and writes nothing',
    async (email) => {
      const result = await findOrCreateGuestUser({
        email,
        fullName: 'x',
        password: 'attacker-pw-123',
      });
      expect(result).toEqual({ status: 'exists' });
      expect(db.users).toHaveLength(0);
    }
  );

  it('the Stripe-verified provisional claim refuses an admin address', async () => {
    const provisional = provisionalPasswordHash();
    pushUser('prov-1', 'ops@carsi.com.au', provisional);
    const result = await findOrCreateGuestUser({
      email: 'ops@carsi.com.au',
      fullName: 'x',
      password: 'attacker-pw-123',
      allowClaim: true,
    });
    expect(result).toEqual({ status: 'exists' });
    expect(db.users[0].hashedPassword).toBe(provisional);
  });

  it('a Stripe guest payment never provisions an admin address', async () => {
    expect(await ensureGuestUserFromStripeEmail('support@carsi.com.au')).toBeNull();
    expect(db.users).toHaveLength(0);
  });

  it('an existing admin account still resolves from its Stripe email (no regression)', async () => {
    pushUser('adm-1', 'support@carsi.com.au', '$2a$12$real', 'admin');
    const claims = await ensureGuestUserFromStripeEmail('support@carsi.com.au');
    expect(claims?.sub).toBe('adm-1');
  });

  it('ordinary emails are unaffected on every path', async () => {
    const reg = await registerUserWithPassword({
      email: 'learner@example.com',
      password: 'pw-123456',
      fullName: 'L',
    });
    expect(reg.ok).toBe(true);
    const guest = await findOrCreateGuestUser({ email: 'guest@example.com', fullName: 'G' });
    expect(guest.status).toBe('created');
    expect(await ensureGuestUserFromStripeEmail('payer@example.com')).not.toBeNull();
  });
});

describe('guest checkout refuses payment it could never fulfil', () => {
  it('flags an unclaimed staff email, any case or spacing', async () => {
    expect(await isReservedGuestCheckoutEmail('  Support@CARSI.com.au ')).toBe(true);
    expect(await isReservedGuestCheckoutEmail('ops@carsi.com.au')).toBe(true);
  });

  it('lets an active staff account and ordinary emails pay, but not an inactive one', async () => {
    pushUser('adm-2', 'ops@carsi.com.au', '$2a$12$real', 'admin');
    expect(await isReservedGuestCheckoutEmail('ops@carsi.com.au')).toBe(false);
    expect(await isReservedGuestCheckoutEmail('learner@example.com')).toBe(false);
    expect(await isReservedGuestCheckoutEmail('')).toBe(false);
    pushUser('adm-3', 'support@carsi.com.au', '$2a$12$real', 'admin');
    db.users[db.users.length - 1].isActive = false;
    expect(await isReservedGuestCheckoutEmail('support@carsi.com.au')).toBe(true);
  });
});
