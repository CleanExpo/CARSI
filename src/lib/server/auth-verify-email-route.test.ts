import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  markVerified: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({
  verifyEmailVerificationToken: mocks.verifyToken,
}));
vi.mock('@/lib/server/lms-auth', () => ({
  markEmailVerified: mocks.markVerified,
}));

const { GET } = await import('../../../app/api/auth/verify-email/route');

function request(query: string): NextRequest {
  return new NextRequest(`https://carsi.example.test/api/auth/verify-email${query}`);
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.verifyToken.mockReset();
  mocks.markVerified.mockReset();
  mocks.verifyToken.mockResolvedValue({ userId: 'user-1', email: 'student@example.test' });
  mocks.markVerified.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/auth/verify-email (GP-699)', () => {
  it('marks the account verified for the address in the token and redirects with success', async () => {
    const res = await GET(request('?token=good'));

    expect(mocks.markVerified).toHaveBeenCalledWith('user-1', 'student@example.test');
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') ?? '');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('email_confirmed')).toBe('1');
  });

  it('changes nothing when the token is missing', async () => {
    const res = await GET(request(''));

    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(new URL(res.headers.get('location') ?? '').searchParams.get('email_confirmed')).toBe(
      '0'
    );
  });

  it('changes nothing when the token is invalid or expired', async () => {
    mocks.verifyToken.mockResolvedValue(null);

    const res = await GET(request('?token=bad'));

    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(new URL(res.headers.get('location') ?? '').searchParams.get('email_confirmed')).toBe(
      '0'
    );
  });

  it('reports failure when the account no longer has the address the token was issued for', async () => {
    mocks.markVerified.mockResolvedValue(false);

    const res = await GET(request('?token=stale'));

    expect(new URL(res.headers.get('location') ?? '').searchParams.get('email_confirmed')).toBe(
      '0'
    );
  });

  it('reports failure, not a crash, when the database write throws', async () => {
    mocks.markVerified.mockRejectedValue(new Error('db down'));

    const res = await GET(request('?token=good'));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') ?? '').searchParams.get('email_confirmed')).toBe(
      '0'
    );
  });

  it('never redirects off-site', async () => {
    const res = await GET(request('?token=good&next=https://evil.example'));

    expect(new URL(res.headers.get('location') ?? '').host).toBe('carsi.example.test');
  });
});
