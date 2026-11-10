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

const route = await import('../../../app/api/auth/verify-email/route');
const { POST } = route;

/** The form post the "Confirm my email" button sends. */
function post(
  fields: Record<string, string>,
  url = 'https://carsi.example.test/api/auth/verify-email'
) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.verifyToken.mockReset();
  mocks.markVerified.mockReset();
  mocks.verifyToken.mockResolvedValue({ userId: 'user-1', email: 'student@example.test' });
  mocks.markVerified.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/auth/verify-email (GP-699)', () => {
  it('has no GET handler, so opening a link can never confirm an address', () => {
    expect(Object.keys(route).sort()).toEqual(['POST']);
  });

  it('marks the account verified for the address in the token and redirects with success', async () => {
    const res = await POST(post({ token: 'good' }));

    expect(mocks.verifyToken).toHaveBeenCalledWith('good');
    expect(mocks.markVerified).toHaveBeenCalledWith('user-1', 'student@example.test');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/login?email_confirmed=1');
  });

  it('ignores a token in the query string: only the posted form field counts', async () => {
    const res = await POST(post({}, 'https://carsi.example.test/api/auth/verify-email?token=good'));

    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('changes nothing when the token is missing', async () => {
    const res = await POST(post({}));

    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('changes nothing when the body is not a form', async () => {
    const res = await POST(
      new NextRequest('https://carsi.example.test/api/auth/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'good' }),
      })
    );

    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('changes nothing when the token is invalid or expired', async () => {
    mocks.verifyToken.mockResolvedValue(null);

    const res = await POST(post({ token: 'bad' }));

    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('changes nothing when the database is not configured', async () => {
    delete process.env.DATABASE_URL;

    const res = await POST(post({ token: 'good' }));

    expect(mocks.markVerified).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('reports failure when the account no longer has the address the token was issued for', async () => {
    mocks.markVerified.mockResolvedValue(false);

    const res = await POST(post({ token: 'stale' }));

    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('reports failure, not a crash, when the database write throws', async () => {
    mocks.markVerified.mockRejectedValue(new Error('db down'));

    const res = await POST(post({ token: 'good' }));

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/login?email_confirmed=0');
  });

  it('never redirects off-site, whatever host or destination the request names', async () => {
    const res = await POST(
      post(
        { token: 'good', next: 'https://evil.example', redirect: '//evil.example' },
        'https://evil.example/api/auth/verify-email?next=https://evil.example'
      )
    );

    // A path-only Location cannot name another site.
    expect(res.headers.get('location')).toBe('/login?email_confirmed=1');
  });
});
