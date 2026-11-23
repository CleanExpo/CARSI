import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-701 — a person who is already signed in when they press "Confirm my email"
 * must still see whether it worked. The route's redirect goes through the
 * middleware, which sends a signed-in person away from the auth pages, so the
 * outcome has to land on a page the middleware lets them reach.
 */

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  markVerified: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/session-jwt')>()),
  verifyEmailVerificationToken: mocks.verifyToken,
}));
vi.mock('@/lib/server/lms-auth', () => ({
  markEmailVerified: mocks.markVerified,
}));

const { POST } = await import('../../../app/api/auth/verify-email/route');
const { updateSession } = await import('@/lib/api/middleware');
const { signSessionToken } = await import('@/lib/auth/session-jwt');
const { default: ConfirmEmailPage } = await import('../../../app/(auth)/confirm-email/page');

const ORIGIN = 'https://carsi.example.test';
let sessionCookie: string;

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'test-secret-that-is-long-enough-for-the-signer-0123456789');
  const token = await signSessionToken({
    sub: 'user-1',
    email: 'student@example.test',
    full_name: 'Student',
    role: 'student',
  });
  sessionCookie = `auth_token=${token}`;
});

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.verifyToken.mockReset();
  mocks.markVerified.mockReset();
  mocks.verifyToken.mockResolvedValue({ userId: 'user-1', email: 'student@example.test' });
  mocks.markVerified.mockResolvedValue(true);
});

async function confirm(markResult: boolean): Promise<string> {
  mocks.markVerified.mockResolvedValue(markResult);
  const res = await POST(
    new NextRequest(`${ORIGIN}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'good' }).toString(),
    })
  );
  const location = res.headers.get('location');
  expect(location).toBeTruthy();
  return location as string;
}

/** What the browser gets when it follows the route's redirect with the session cookie. */
async function followSignedIn(location: string) {
  return updateSession(
    new NextRequest(new URL(location, ORIGIN), { headers: { cookie: sessionCookie } })
  );
}

async function renderOutcome(location: string): Promise<string> {
  const url = new URL(location, ORIGIN);
  const element = await ConfirmEmailPage({
    searchParams: Promise.resolve(Object.fromEntries(url.searchParams)),
  });
  return renderToStaticMarkup(element);
}

describe('confirming an email while signed in (GP-701)', () => {
  it.each([
    [true, 'Your email address is confirmed.'],
    [false, 'That confirmation link is invalid or has expired.'],
  ])(
    'lets a signed-in person reach the outcome page and shows it (confirmed=%s)',
    async (ok, message) => {
      const location = await confirm(ok);

      const followed = await followSignedIn(location);
      // The middleware must not bounce the person elsewhere, dropping the notice.
      expect(followed.headers.get('location')).toBeNull();
      expect(followed.status).toBe(200);

      expect(await renderOutcome(location)).toContain(message);
    }
  );

  it('still shows the outcome to a person who is not signed in', async () => {
    const location = await confirm(true);
    const followed = await updateSession(new NextRequest(new URL(location, ORIGIN)));
    expect(followed.headers.get('location')).toBeNull();
    expect(await renderOutcome(location)).toContain('Your email address is confirmed.');
  });
});
