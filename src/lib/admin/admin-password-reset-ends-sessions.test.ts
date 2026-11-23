import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken } from '@/lib/auth/session-jwt';

/**
 * GP-760 review (f512fd90, P1): an admin password reset is a password write on an established
 * account, so it ends every older session of that user, exactly as the emailed reset link does.
 * The stand-in below is one lms_users row; update() applies Prisma's `{ increment }` the way the
 * database would, and the session reader reads the same row.
 */

const USER_ID = '50000000-0000-4000-8000-000000000762';
const EMAIL = 'member@example.test';

const row = vi.hoisted(() => ({
  hashedPassword: '',
  isActive: true,
  sessionGeneration: 0,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: vi.fn(async () => ({ id: USER_ID, email: EMAIL, fullName: 'Member' })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && 'increment' in value) {
            (row as Record<string, unknown>)[key] =
              ((row as Record<string, unknown>)[key] as number) +
              (value as { increment: number }).increment;
          } else {
            (row as Record<string, unknown>)[key] = value;
          }
        }
        return { id: USER_ID, email: EMAIL, fullName: 'Member', ...row };
      }),
    },
    $queryRaw: vi.fn(async () => [
      {
        id: USER_ID,
        email: EMAIL,
        full_name: 'Member',
        is_active: row.isActive,
        role: null,
        session_generation: row.sessionGeneration,
        role_names: ['student'],
      },
    ]),
  },
}));

vi.mock('@/lib/server/transactional-email', () => ({
  sendAdminPasswordResetEmail: vi.fn(async () => ({ sent: false })),
}));

const { adminResetUserPassword } = await import('@/lib/admin/admin-password-reset');
const { verifyActiveSession } = await import('@/lib/server/user-active-cache');

beforeEach(() => {
  row.hashedPassword = '$2a$12$previous';
  row.isActive = true;
  row.sessionGeneration = 0;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('GP-760 an admin password reset ends the member’s older sessions', () => {
  it('adds one to the session generation in the same write as the new password', async () => {
    await adminResetUserPassword({
      userId: USER_ID,
      appOrigin: 'https://carsi.example.test',
      initiatedByAdminEmail: 'admin@example.test',
    });
    expect(row.hashedPassword.startsWith('$2')).toBe(true);
    expect(row.hashedPassword).not.toBe('$2a$12$previous');
    expect(row.sessionGeneration).toBe(1);
  });

  it('refuses a session issued before the reset', async () => {
    const oldToken = await signSessionToken({
      sub: USER_ID,
      email: EMAIL,
      full_name: 'Member',
      role: 'student',
      sg: 0,
    });
    expect(await verifyActiveSession(oldToken)).not.toBeNull();

    await adminResetUserPassword({
      userId: USER_ID,
      appOrigin: 'https://carsi.example.test',
      initiatedByAdminEmail: 'admin@example.test',
    });

    expect(await verifyActiveSession(oldToken)).toBeNull();
  });
});
