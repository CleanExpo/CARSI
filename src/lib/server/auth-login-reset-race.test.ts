import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-760 (b), review round 2: a login that read the password hash BEFORE a password reset
 * committed must not mint a session of the generation the reset created. The interleaving is
 * fixed by the stand-in database: the login's first read sees the old hash at generation 0; the
 * reset commits; the claims read then sees generation 1.
 */

const OLD_PASSWORD = 'Old-strong-pass-1';
const USER_ID = '40000000-0000-4000-8000-000000000760';
const EMAIL = 'race@example.test';

const db = vi.hoisted(() => ({ generationAtClaimsRead: 0, hash: '' }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      // The login's read: the hash and generation before the reset.
      findUnique: vi.fn(async () => ({
        id: USER_ID,
        email: EMAIL,
        fullName: 'Race',
        isActive: true,
        role: null,
        hashedPassword: db.hash,
        sessionGeneration: 0,
      })),
    },
    // The claims read (readLmsUserNow), after the reset may have committed.
    $queryRaw: vi.fn(async () => [
      {
        id: USER_ID,
        email: EMAIL,
        full_name: 'Race',
        is_active: true,
        role: null,
        session_generation: db.generationAtClaimsRead,
        role_names: ['student'],
      },
    ]),
  },
}));

const { authenticateWithPassword } = await import('@/lib/server/lms-auth');

beforeEach(async () => {
  db.hash ||= await bcrypt.hash(OLD_PASSWORD, 4);
  db.generationAtClaimsRead = 0;
});

describe('GP-760 login racing a password reset', () => {
  it('signs in normally when no reset happened in between', async () => {
    const claims = await authenticateWithPassword(EMAIL, OLD_PASSWORD);
    expect(claims?.sg).toBe(0);
  });

  it('refuses to mint a new-generation session from the old password', async () => {
    db.generationAtClaimsRead = 1; // the reset committed after the hash was read
    expect(await authenticateWithPassword(EMAIL, OLD_PASSWORD)).toBeNull();
  });
});
