import { describe, expect, it } from 'vitest';

import {
  hasSessionSentinel,
  SESSION_SENTINEL_COOKIE,
  SESSION_SENTINEL_MAX_AGE,
  SESSION_SENTINEL_VALUE,
  sessionSentinelAction,
  sessionSentinelCookieOptions,
} from './session-sentinel';

describe('sessionSentinelAction', () => {
  it('sets the sentinel only when a session exists and the request lacks it', () => {
    expect(sessionSentinelAction(true, false)).toBe('set');
  });

  it('clears the sentinel only when no session exists and the request carries it', () => {
    expect(sessionSentinelAction(false, true)).toBe('clear');
  });

  it('writes nothing when the sentinel already matches the session, so ordinary responses carry no Set-Cookie', () => {
    expect(sessionSentinelAction(true, true)).toBe('keep');
    expect(sessionSentinelAction(false, false)).toBe('keep');
  });
});

describe('hasSessionSentinel', () => {
  it('accepts the exact cookie anywhere in the header', () => {
    expect(hasSessionSentinel(`${SESSION_SENTINEL_COOKIE}=1`)).toBe(true);
    expect(hasSessionSentinel(`theme=dark; ${SESSION_SENTINEL_COOKIE}=1; other=x`)).toBe(true);
    expect(hasSessionSentinel(`other=x;${SESSION_SENTINEL_COOKIE}=1`)).toBe(true);
  });

  it('rejects an empty header, look-alike names and other values', () => {
    expect(hasSessionSentinel('')).toBe(false);
    expect(hasSessionSentinel(`${SESSION_SENTINEL_COOKIE}_old=1`)).toBe(false);
    expect(hasSessionSentinel(`x${SESSION_SENTINEL_COOKIE}=1`)).toBe(false);
    expect(hasSessionSentinel(`${SESSION_SENTINEL_COOKIE}=0`)).toBe(false);
    expect(hasSessionSentinel(`${SESSION_SENTINEL_COOKIE}=`)).toBe(false);
    expect(hasSessionSentinel('auth_token=abc; carsi_token=abc')).toBe(false);
  });
});

describe('the sentinel cookie itself', () => {
  it('is readable by scripts, otherwise shaped like the session cookies, and lives as long as they do', () => {
    expect(sessionSentinelCookieOptions(true)).toEqual({
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(sessionSentinelCookieOptions(false).secure).toBe(false);
    expect(SESSION_SENTINEL_MAX_AGE).toBe(60 * 60 * 24 * 7);
    expect(SESSION_SENTINEL_COOKIE).toBe('carsi_session');
    expect(SESSION_SENTINEL_VALUE).toBe('1');
    expect(SESSION_SENTINEL_VALUE).not.toMatch(/eyJ|[A-Za-z0-9_-]{20,}/);
  });
});
