import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyTurnstileToken } from './turnstile';

const original = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = original;
  vi.unstubAllGlobals();
});

describe('verifyTurnstileToken (issue #118)', () => {
  it('skips (ok) when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(await verifyTurnstileToken('anything')).toEqual({ ok: true, skipped: true });
  });

  it('rejects a missing token when a secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect((await verifyTurnstileToken(undefined)).ok).toBe(false);
    expect((await verifyTurnstileToken('')).ok).toBe(false);
  });

  it('returns ok=true when siteverify succeeds', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ success: true }) }))
    );
    expect((await verifyTurnstileToken('tok')).ok).toBe(true);
  });

  it('returns ok=false when siteverify rejects the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ success: false }) }))
    );
    expect((await verifyTurnstileToken('tok')).ok).toBe(false);
  });

  it('fails closed on a network error', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network');
      })
    );
    expect((await verifyTurnstileToken('tok')).ok).toBe(false);
  });
});
