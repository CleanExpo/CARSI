import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS1 (P0-A) — unauthenticated account-takeover fix.
 *
 * `findOrCreateGuestUser` used to overwrite an existing user's password and mint
 * their session whenever a caller supplied an email that already belonged to an
 * account (guest-checkout.ts:24-34). Reachable unauthenticated via
 * `/api/lms/enrollments/guest-free`, this was a full takeover of any learner or
 * admin whose email was known.
 *
 * The fix mirrors the discipline already in `registerUserWithPassword`
 * (lms-auth.ts:116-134): an *established* account (real password) is never
 * overwritten and never gets a session from these paths; only an *unclaimed
 * provisional* account (never had a human-set password) can be claimed, and only
 * on the Stripe-verified path (`allowClaim`). Brand-new emails are created.
 *
 * These tests mock ONLY the prisma DB boundary; the real auth/bcrypt logic runs.
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
      create: vi.fn(async ({ data }: { data: Partial<MockUser> & { id: string; email: string; hashedPassword: string } }) => {
        const user: MockUser = {
          fullName: null,
          isActive: true,
          isVerified: false,
          role: null,
          ...data,
        };
        db.users.push(user);
        return user;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
        const user = db.users.find((u) => u.id === where.id);
        if (!user) throw new Error('not found');
        Object.assign(user, data);
        return user;
      }),
    },
    lmsRole: {
      findUnique: vi.fn(async ({ where }: { where: { name: string } }) =>
        db.roles.find((r) => r.name === where.name) ?? null,
      ),
    },
    lmsUserRole: {
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) =>
        db.userRoles
          .filter((ur) => ur.userId === where.userId)
          .map((ur) => ({ ...ur, role: db.roles.find((r) => r.id === ur.roleId) })),
      ),
      create: vi.fn(async ({ data }: { data: { userId: string; roleId: number } }) => {
        db.userRoles.push(data);
        return data;
      }),
    },
  },
}));

import { findOrCreateGuestUser, ensureGuestUserFromStripeEmail } from '@/lib/server/guest-checkout';
import { hashPassword, verifyPassword } from '@/lib/server/lms-auth';

function findUser(email: string): MockUser {
  const u = db.users.find((x) => x.email === email);
  if (!u) throw new Error(`no user ${email}`);
  return u;
}

beforeEach(() => {
  db.users = [];
  db.userRoles = [];
});

describe('findOrCreateGuestUser — WS1 account-takeover fix', () => {
  it('never overwrites an established account and returns exists with no session (guest-free path)', async () => {
    const original = await hashPassword('correct-horse-battery');
    db.users.push({
      id: 'victim-1',
      email: 'victim@example.com',
      hashedPassword: original,
      fullName: 'Victim Admin',
      isActive: true,
      isVerified: true,
      role: 'admin',
    });

    const result = await findOrCreateGuestUser({
      email: 'victim@example.com',
      fullName: 'attacker',
      password: 'attacker-chosen-pw',
      allowClaim: false,
    });

    expect(result.status).toBe('exists');
    expect('claims' in result).toBe(false);
    // Password must be untouched — the victim can still log in; the attacker's password does NOT work.
    const stored = findUser('victim@example.com').hashedPassword;
    expect(await verifyPassword('correct-horse-battery', stored)).toBe(true);
    expect(await verifyPassword('attacker-chosen-pw', stored)).toBe(false);
  });

  it('never overwrites an established account even on the Stripe-verified path (allowClaim)', async () => {
    const original = await hashPassword('correct-horse-battery');
    db.users.push({
      id: 'victim-2',
      email: 'paid-victim@example.com',
      hashedPassword: original,
      fullName: 'Paid Victim',
      isActive: true,
      isVerified: true,
      role: 'student',
    });

    const result = await findOrCreateGuestUser({
      email: 'paid-victim@example.com',
      fullName: 'attacker',
      password: 'attacker-chosen-pw',
      allowClaim: true,
    });

    expect(result.status).toBe('exists');
    const stored = findUser('paid-victim@example.com').hashedPassword;
    expect(await verifyPassword('correct-horse-battery', stored)).toBe(true);
    expect(await verifyPassword('attacker-chosen-pw', stored)).toBe(false);
  });

  it('claims an unclaimed provisional account on the Stripe-verified path (sets password + session)', async () => {
    db.users.push({
      id: 'prov-1',
      email: 'newpayer@example.com',
      hashedPassword: 'provisional:seed-token',
      fullName: null,
      isActive: true,
      isVerified: false,
      role: null,
    });

    const result = await findOrCreateGuestUser({
      email: 'newpayer@example.com',
      fullName: 'New Payer',
      password: 'chosen-pass-123',
      allowClaim: true,
    });

    expect(result.status).toBe('claimed');
    if (result.status !== 'claimed') throw new Error('unreachable');
    expect(result.claims.sub).toBe('prov-1');
    const stored = findUser('newpayer@example.com').hashedPassword;
    expect(await verifyPassword('chosen-pass-123', stored)).toBe(true);
  });

  it('does NOT claim a provisional account on the unauthenticated guest-free path', async () => {
    db.users.push({
      id: 'prov-2',
      email: 'someone@example.com',
      hashedPassword: 'provisional:seed-token',
      fullName: null,
      isActive: true,
      isVerified: false,
      role: null,
    });

    const result = await findOrCreateGuestUser({
      email: 'someone@example.com',
      fullName: 'attacker',
      password: 'attacker-chosen-pw',
      allowClaim: false,
    });

    expect(result.status).toBe('exists');
    // Untouched — still the provisional marker, not the attacker's password.
    expect(findUser('someone@example.com').hashedPassword).toBe('provisional:seed-token');
  });

  it('creates and authenticates a brand-new account', async () => {
    const result = await findOrCreateGuestUser({
      email: 'brand-new@example.com',
      fullName: 'Brand New',
      password: 'chosen-pass-123',
      allowClaim: false,
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') throw new Error('unreachable');
    expect(result.claims.email).toBe('brand-new@example.com');
    const stored = findUser('brand-new@example.com').hashedPassword;
    expect(await verifyPassword('chosen-pass-123', stored)).toBe(true);
  });
});

describe('ensureGuestUserFromStripeEmail — provisional marker', () => {
  it('provisions a claimable (non-bcrypt, non-authenticating) placeholder password', async () => {
    await ensureGuestUserFromStripeEmail('stripe-guest@example.com');
    const user = findUser('stripe-guest@example.com');
    // Must NOT be a real bcrypt hash — it is an unclaimed provisional marker so the
    // rightful payer can later claim it via guest-complete without a takeover risk.
    expect(user.hashedPassword.startsWith('$2')).toBe(false);
    // And it must never authenticate a password.
    expect(await verifyPassword('anything', user.hashedPassword)).toBe(false);
  });
});
