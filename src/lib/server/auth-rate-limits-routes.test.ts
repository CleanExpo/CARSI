import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signSessionToken } from '@/lib/auth/session-jwt';

/**
 * GP-760 (c): reset-password, verify-email and refresh are rate limited. Here the database is not
 * configured, so the limiter runs on its in-process fallback; that it is held in Postgres across
 * deploys and instances is proved in durable-rate-limit.pg.test.ts.
 */

const mocks = vi.hoisted(() => ({
  verifyEmailToken: vi.fn(),
  markVerified: vi.fn(),
  claimsFor: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth/session-jwt')>();
  return { ...real, verifyEmailVerificationToken: mocks.verifyEmailToken };
});
vi.mock('@/lib/server/lms-auth', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/server/lms-auth')>();
  return { ...real, markEmailVerified: mocks.markVerified, sessionClaimsForUserId: mocks.claimsFor };
});
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { POST: resetPassword } = await import('../../../app/api/auth/reset-password/route');
const { POST: verifyEmail } = await import('../../../app/api/auth/verify-email/route');
const { POST: refresh } = await import('../../../app/api/auth/refresh/route');

const CLAIMS = {
  sub: '40000000-0000-4000-8000-000000000760',
  email: 'learner@example.test',
  full_name: 'Learner',
  role: 'student',
};

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', '');
  mocks.verifyEmailToken.mockReset().mockResolvedValue({ userId: CLAIMS.sub, email: CLAIMS.email });
  mocks.markVerified.mockReset().mockResolvedValue(true);
  mocks.claimsFor.mockReset().mockResolvedValue(CLAIMS);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

async function repeat(n: number, send: () => Promise<Response>): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push((await send()).status);
  return out;
}

describe('GP-760 rate limits on reset-password, verify-email and refresh', () => {
  it('reset-password: the 11th attempt from one IP in 15 minutes gets 429', async () => {
    const send = () =>
      resetPassword(
        new NextRequest('https://carsi.example.test/api/auth/reset-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.31' },
          body: JSON.stringify({ token: 'guess', new_password: 'A-strong-pass-9' }),
        })
      );
    const statuses = await repeat(11, send);
    expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('verify-email: after 20 confirmations from one IP the next is refused before the token is read', async () => {
    const send = () =>
      verifyEmail(
        new NextRequest('https://carsi.example.test/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-forwarded-for': '198.51.100.32',
          },
          body: new URLSearchParams({ token: 'good' }).toString(),
        })
      );
    await repeat(20, send);
    expect(mocks.verifyEmailToken).toHaveBeenCalledTimes(20);
    const limited = await send();
    expect(mocks.verifyEmailToken).toHaveBeenCalledTimes(20);
    expect(limited.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('refresh: the 31st renewal for one user in 15 minutes gets 429', async () => {
    const token = await signSessionToken(CLAIMS);
    const send = () =>
      refresh(
        new NextRequest('https://carsi.example.test/api/auth/refresh', {
          method: 'POST',
          headers: { cookie: `auth_token=${token}`, 'x-forwarded-for': '198.51.100.33' },
        })
      );
    const statuses = await repeat(31, send);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
