import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  findUser: vi.fn(),
  updateUser: vi.fn(),
  hash: vi.fn(),
  claims: vi.fn(),
  signSession: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({
  verifyPasswordResetToken: mocks.verifyToken,
  signSessionToken: mocks.signSession,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.findUser, update: mocks.updateUser },
  },
}));
vi.mock('@/lib/server/lms-auth', () => ({
  hashPassword: mocks.hash,
  sessionClaimsForUserId: mocks.claims,
}));

const { POST } = await import('../../../app/api/auth/reset-password/route');

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://carsi.example.test/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.verifyToken.mockReset();
  mocks.findUser.mockReset();
  mocks.updateUser.mockReset();
  mocks.hash.mockReset();
  mocks.claims.mockReset();
  mocks.signSession.mockReset();
  mocks.verifyToken.mockResolvedValue('user-1');
  mocks.findUser.mockResolvedValue({ id: 'user-1', email: 'buyer@carsi.com.au' });
  mocks.updateUser.mockResolvedValue({});
  mocks.hash.mockResolvedValue('$2a$12$new');
  mocks.claims.mockResolvedValue({
    sub: 'user-1',
    email: 'buyer@carsi.com.au',
    full_name: 'Buyer',
    role: 'student',
  });
  mocks.signSession.mockResolvedValue('jwt-session');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/auth/reset-password', () => {
  it('signs the guest in and returns them to the course they paid for', async () => {
    const res = await POST(
      request({
        token: 'reset-token',
        new_password: 'A-strong-pass-9',
        next: '/dashboard/learn/level-1-mould-remediation-2cc96b85',
      })
    );
    const body = (await res.json()) as { signed_in?: boolean; redirect_to?: string };

    expect(res.status).toBe(200);
    expect(body.signed_in).toBe(true);
    expect(body.redirect_to).toBe('/dashboard/learn/level-1-mould-remediation-2cc96b85');
    expect(res.cookies.get('auth_token')?.value).toBe('jwt-session');
    expect(mocks.signSession).toHaveBeenCalledTimes(1);
  });

  it('drops an off-site next and still signs them in to the student dashboard', async () => {
    const res = await POST(
      request({
        token: 'reset-token',
        new_password: 'A-strong-pass-9',
        next: 'https://evil.example/phish',
      })
    );
    const body = (await res.json()) as { redirect_to?: string };

    expect(res.status).toBe(200);
    expect(body.redirect_to).toBe('/dashboard/student');
  });
});
