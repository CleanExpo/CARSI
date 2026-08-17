import { describe, expect, it } from 'vitest';

import { allowedCheckoutOrigins, resolveCheckoutRedirect } from './checkout-redirect';

const FALLBACK = 'https://carsi.com.au/courses/x/payment-success?session_id={CHECKOUT_SESSION_ID}';
const REQUEST_ORIGIN = 'https://www.carsi.com.au';

describe('allowedCheckoutOrigins', () => {
  it('accepts both the www and apex forms, since the canonical and the browser disagree', () => {
    const origins = allowedCheckoutOrigins(REQUEST_ORIGIN);
    expect(origins).toContain('https://carsi.com.au');
    expect(origins).toContain('https://www.carsi.com.au');
  });

  it('includes the request origin so previews and dev hosts still work', () => {
    expect(allowedCheckoutOrigins('http://localhost:3000')).toContain('http://localhost:3000');
  });
});

describe('resolveCheckoutRedirect', () => {
  it('keeps a same-origin URL verbatim, placeholder intact', () => {
    const candidate = 'https://www.carsi.com.au/courses/abc/payment-success?session_id={CHECKOUT_SESSION_ID}';
    const got = resolveCheckoutRedirect(candidate, REQUEST_ORIGIN, FALLBACK);
    expect(got).toBe(candidate);
    // Round-tripping through new URL() would percent-encode the braces and break session lookup.
    expect(got).toContain('{CHECKOUT_SESSION_ID}');
  });

  it('keeps the apex form when the request came from www', () => {
    const candidate = 'https://carsi.com.au/dashboard/student';
    expect(resolveCheckoutRedirect(candidate, REQUEST_ORIGIN, FALLBACK)).toBe(candidate);
  });

  // The vulnerability this module exists for.
  it('rejects an attacker-controlled origin', () => {
    expect(resolveCheckoutRedirect('https://evil.example.com/pay', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it('rejects a lookalike host that merely contains the site name', () => {
    expect(resolveCheckoutRedirect('https://carsi.com.au.evil.example.com/x', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect('https://notcarsi.com.au/x', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it('rejects a subdomain that was never allowlisted', () => {
    expect(resolveCheckoutRedirect('https://evil.carsi.com.au/x', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it('rejects userinfo smuggling that points at another host', () => {
    expect(
      resolveCheckoutRedirect('https://www.carsi.com.au@evil.example.com/x', REQUEST_ORIGIN, FALLBACK),
    ).toBe(FALLBACK);
  });

  // `startsWith('http')` is a prefix test on the whole string, so these slipped through it.
  it('rejects non-http schemes', () => {
    expect(resolveCheckoutRedirect('javascript:alert(1)', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect('data:text/html,<script>1</script>', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for missing, empty and non-string values', () => {
    expect(resolveCheckoutRedirect(undefined, REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect('', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect('   ', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect(42, REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
    expect(resolveCheckoutRedirect({ toString: () => 'https://evil.example.com' }, REQUEST_ORIGIN, FALLBACK)).toBe(
      FALLBACK,
    );
  });

  it('falls back for a relative path, which Stripe cannot use anyway', () => {
    expect(resolveCheckoutRedirect('/courses/abc', REQUEST_ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it('still accepts the localhost origin a developer actually runs on', () => {
    const candidate = 'http://localhost:3002/courses/abc/payment-success';
    expect(resolveCheckoutRedirect(candidate, 'http://localhost:3002', FALLBACK)).toBe(candidate);
  });
});

/**
 * The request origin is trusted, and that trust is inherited from the platform.
 *
 * All six call sites pass `request.nextUrl.origin`, which comes from the Host header, so this
 * allowlist is only as trustworthy as the platform's Host handling. Production rejects a forged
 * Host at the edge with 403 before the application sees it (measured 2026-08-18), which is what
 * makes this safe today.
 *
 * The dependency is wider than this module — those routes already build their DEFAULT return
 * URLs from the same value, so a forged Host would steer the fallback with or without an
 * allowlist. These cases exist to pin the behaviour, not to endorse it: if CARSI moves to a host
 * that forwards arbitrary Host headers, someone reading these will know immediately what breaks.
 */
describe('trust boundary: the request origin is inherited from the platform', () => {
  it('trusts whatever origin it is handed — the caller must pass a Host-derived value', () => {
    const attacker = 'https://evil.example.com';
    expect(allowedCheckoutOrigins(attacker)).toContain(attacker);
    expect(resolveCheckoutRedirect(`${attacker}/pay`, attacker, FALLBACK)).toBe(`${attacker}/pay`);
  });

  it('never lets an unrelated candidate through on the canonical origins alone', () => {
    // With no request origin at all, only the site's own www/apex forms are allowed — this is
    // the floor the allowlist guarantees regardless of what the platform does with Host.
    expect(resolveCheckoutRedirect('https://evil.example.com/pay', null, FALLBACK)).toBe(FALLBACK);
    expect(allowedCheckoutOrigins(null)).toEqual(
      expect.arrayContaining(['https://carsi.com.au', 'https://www.carsi.com.au']),
    );
    expect(allowedCheckoutOrigins(null)).not.toContain('https://evil.example.com');
  });
});
