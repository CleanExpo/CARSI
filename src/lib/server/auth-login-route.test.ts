/**
 * Route-level cover for `POST /api/auth/login`.
 *
 * A guest who paid is created with `provisional:<uuid>` and cannot authenticate
 * by password. The login route must not tell them "Invalid credentials" — that
 * reads as a typo — and must point them at /forgot-password, which already
 * writes a real hash for any active user.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  loginFailureKind: vi.fn(),
  signSession: vi.fn(),
}));

vi.mock('@/lib/server/lms-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/lms-auth')>();
  return {
    ...actual,
    authenticateWithPassword: mocks.authenticate,
    loginFailureKindForEmail: mocks.loginFailureKind,
  };
});

vi.mock('@/lib/auth/session-jwt', () => ({
  signSessionToken: mocks.signSession,
}));

const { POST } = await import('../../../app/api/auth/login/route');

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://carsi.example.test/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.authenticate.mockReset();
  mocks.loginFailureKind.mockReset();
  mocks.signSession.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('a guest whose account has only a provisional password', () => {
  it('is told to set a password, not that the credentials were invalid', async () => {
    mocks.authenticate.mockResolvedValue(null);
    mocks.loginFailureKind.mockResolvedValue('needs_password_setup');

    const res = await POST(
      request({ email: 'brighttouchcleaner@gmail.com', password: 'whatever' }),
    );
    const body = (await res.json()) as {
      error?: string;
      code?: string;
      reset_path?: string;
    };

    expect(res.status).toBe(401);
    expect(body.code).toBe('needs_password_setup');
    expect(body.reset_path).toBe('/forgot-password');
    expect(body.error?.toLowerCase()).not.toContain('invalid credentials');
    expect(body.error?.toLowerCase()).toMatch(/password/);
    expect(mocks.signSession).not.toHaveBeenCalled();
  });
});

describe('an established account with a wrong password', () => {
  it('still gets the generic invalid-credentials response', async () => {
    mocks.authenticate.mockResolvedValue(null);
    mocks.loginFailureKind.mockResolvedValue('invalid');

    const res = await POST(request({ email: 'member@example.test', password: 'wrong' }));
    const body = (await res.json()) as { error?: string; code?: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Invalid credentials');
    expect(body.code).toBeUndefined();
  });
});
