import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { SESSION_SENTINEL_COOKIE, SESSION_SENTINEL_MAX_AGE } from '@/lib/auth/session-sentinel';

import { updateSession } from './middleware';

const PUBLIC_PAGE = 'https://carsi.com.au/courses';

function request(cookie?: string) {
  return new NextRequest(PUBLIC_PAGE, cookie ? { headers: { cookie } } : undefined);
}

let token: string;

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'test-secret-that-is-long-enough-for-the-signer-0123456789');
  token = await signSessionToken({ sub: 'user-1', email: 'learner@example.test', full_name: 'Learner', role: 'user' });
});

describe('updateSession keeps the session sentinel in step with the verified session', () => {
  it('writes nothing for an anonymous request that carries no sentinel', async () => {
    const response = await updateSession(request());
    expect(response.cookies.get(SESSION_SENTINEL_COOKIE)).toBeUndefined();
  });

  it('clears a stale sentinel on an anonymous request', async () => {
    const response = await updateSession(request(`${SESSION_SENTINEL_COOKIE}=1`));
    const sentinel = response.cookies.get(SESSION_SENTINEL_COOKIE);
    expect(sentinel?.value).toBe('');
    expect(sentinel?.maxAge).toBe(0);
  });

  it('sets the sentinel, readable by scripts and as long-lived as the session, for a signed-in request that lacks it', async () => {
    const response = await updateSession(request(`auth_token=${token}`));
    const sentinel = response.cookies.get(SESSION_SENTINEL_COOKIE);
    expect(sentinel?.value).toBe('1');
    expect(sentinel?.httpOnly).toBeFalsy();
    expect(sentinel?.path).toBe('/');
    expect(sentinel?.sameSite).toBe('lax');
    expect(sentinel?.maxAge).toBe(SESSION_SENTINEL_MAX_AGE);
  });

  it('writes nothing for a signed-in request that already carries the sentinel', async () => {
    const response = await updateSession(request(`auth_token=${token}; ${SESSION_SENTINEL_COOKIE}=1`));
    expect(response.cookies.get(SESSION_SENTINEL_COOKIE)).toBeUndefined();
  });

  it('clears the sentinel alongside the session cookies when the token no longer verifies', async () => {
    const response = await updateSession(request(`auth_token=not-a-token; ${SESSION_SENTINEL_COOKIE}=1`));
    expect(response.cookies.get(SESSION_SENTINEL_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get('auth_token')?.value).toBe('');
  });
});
