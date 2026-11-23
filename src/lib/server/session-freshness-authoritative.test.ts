import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken } from '@/lib/auth/session-jwt';

/**
 * GP-760 review (f512fd90, P1 x2): whether a session is still current is decided by the database on
 * every request, for every role, and an unreadable database refuses the session.
 *
 *  - No per-instance cache: a password reset that commits on ANOTHER instance bumps the
 *    generation in the database, which this instance must see on its very next request. The
 *    stand-in below is that database; nothing here clears any in-process state between the reads.
 *  - Fail closed: if the read throws, freshness is unknown, so the session is not current.
 */

const USER_ID = '50000000-0000-4000-8000-000000000761';
const EMAIL = 'learner@example.test';

const db = vi.hoisted(() => ({
  generation: 0,
  active: true,
  roleNames: ['student'] as string[],
  reads: 0,
  fail: false,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => {
      db.reads += 1;
      if (db.fail) throw new Error('db down');
      return [
        {
          id: USER_ID,
          email: EMAIL,
          full_name: 'Learner',
          is_active: db.active,
          role: null,
          session_generation: db.generation,
          role_names: db.roleNames,
        },
      ];
    }),
  },
}));

const { verifyActiveSession } = await import('@/lib/server/user-active-cache');

function tokenFor(role: string, sg: number) {
  return signSessionToken({ sub: USER_ID, email: EMAIL, full_name: 'Learner', role, sg });
}

beforeEach(() => {
  db.generation = 0;
  db.active = true;
  db.roleNames = ['student'];
  db.reads = 0;
  db.fail = false;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GP-760 session freshness is read from the database on every request', () => {
  it('refuses a learner session on the next request after another instance ends it', async () => {
    const token = await tokenFor('student', 0);
    expect(await verifyActiveSession(token)).not.toBeNull();

    db.generation = 1; // a password reset committed elsewhere; this instance was not told
    expect(await verifyActiveSession(token)).toBeNull();
  });

  it('refuses a learner session on the next request after the account is deactivated', async () => {
    const token = await tokenFor('student', 0);
    expect(await verifyActiveSession(token)).not.toBeNull();

    db.active = false;
    expect(await verifyActiveSession(token)).toBeNull();
  });

  it('reads the database for every learner request (no cached answer)', async () => {
    const token = await tokenFor('student', 0);
    await verifyActiveSession(token);
    await verifyActiveSession(token);
    expect(db.reads).toBe(2);
  });
});

describe('GP-760 session freshness fails closed when the database cannot be read', () => {
  it.each(['student', 'admin', 'instructor'])(
    'refuses a %s session when the read throws',
    async (role) => {
      db.roleNames = [role];
      db.fail = true;
      expect(await verifyActiveSession(await tokenFor(role, 0))).toBeNull();
    }
  );

  it('refuses an ended learner session when the read throws', async () => {
    db.generation = 1;
    db.fail = true;
    expect(await verifyActiveSession(await tokenFor('student', 0))).toBeNull();
  });

  it('still accepts a current session once the database answers again', async () => {
    const token = await tokenFor('student', 0);
    db.fail = true;
    expect(await verifyActiveSession(token)).toBeNull();
    db.fail = false;
    expect(await verifyActiveSession(token)).not.toBeNull();
  });
});
