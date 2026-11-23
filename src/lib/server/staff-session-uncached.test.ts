import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken } from '@/lib/auth/session-jwt';

/**
 * GP-760, Phill's ruling 22/11/2026: admin AND instructor role gates follow a demotion within one
 * request. The shared session reader (getSessionClaimsFromRequest / verifyActiveSession) feeds
 * staff gates such as staff lesson auto-enrolment and practical-assessment review, so a token that
 * claims admin or instructor is re-read from the database on every request. (Since the review of
 * f512fd90 every token is: there is no session cache at all; session-freshness-authoritative.test.ts.)
 */

const USER_ID = '50000000-0000-4000-8000-000000000760';
const EMAIL = 'staff@example.test';

const db = vi.hoisted(() => ({ roleNames: ['admin'] as string[], reads: 0, fail: false }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => {
      db.reads += 1;
      if (db.fail) throw new Error('db down');
      return [
        {
          id: USER_ID,
          email: EMAIL,
          full_name: 'Staff',
          is_active: true,
          role: null,
          session_generation: 0,
          role_names: db.roleNames,
        },
      ];
    }),
  },
}));

const { getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request');

async function requestAs(role: string) {
  const token = await signSessionToken({ sub: USER_ID, email: EMAIL, full_name: 'Staff', role, sg: 0 });
  return new NextRequest('https://carsi.example.test/api/lms/lessons/x', {
    headers: { cookie: `auth_token=${token}` },
  });
}

beforeEach(() => {
  db.reads = 0;
  db.fail = false;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GP-760 staff tokens are re-read from the database on every request', () => {
  it.each(['admin', 'instructor'])('a demoted %s is refused on the very next request', async (role) => {
    db.roleNames = [role];
    expect((await getSessionClaimsFromRequest(await requestAs(role)))?.role).toBe(role);

    db.roleNames = ['student']; // demoted between two requests
    expect(await getSessionClaimsFromRequest(await requestAs(role))).toBeNull();
  });

  it('a staff token is refused when the database cannot be read (fails closed)', async () => {
    db.fail = true;
    expect(await getSessionClaimsFromRequest(await requestAs('instructor'))).toBeNull();
  });

  it('a learner token is also read from the database on every request (two reads for two requests)', async () => {
    db.roleNames = ['student'];
    expect(await getSessionClaimsFromRequest(await requestAs('student'))).not.toBeNull();
    expect(await getSessionClaimsFromRequest(await requestAs('student'))).not.toBeNull();
    expect(db.reads).toBe(2);
  });
});
