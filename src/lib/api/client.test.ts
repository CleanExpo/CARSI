import { describe, expect, it } from 'vitest';

import { originStatusOf, resolveResponseStatus } from './client';

function res(status: number, headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, headers: { get: (n: string) => lower[n.toLowerCase()] ?? null } };
}

describe('originStatusOf', () => {
  it('reads the status the application answered with', () => {
    expect(originStatusOf(res(504, { 'x-do-orig-status': '503' }))).toBe(503);
  });

  it('returns null when the header is absent', () => {
    expect(originStatusOf(res(504))).toBeNull();
  });

  it('ignores a header that is not a plausible status', () => {
    expect(originStatusOf(res(504, { 'x-do-orig-status': 'nonsense' }))).toBeNull();
    expect(originStatusOf(res(504, { 'x-do-orig-status': '' }))).toBeNull();
    expect(originStatusOf(res(504, { 'x-do-orig-status': '99' }))).toBeNull();
    expect(originStatusOf(res(504, { 'x-do-orig-status': '700' }))).toBeNull();
  });
});

describe('resolveResponseStatus', () => {
  // The defect: production returns 504 + HTML for a route that answered 503 + JSON. The client
  // retried it three times (500/1000/2000 ms = 3.5 s over four requests) and then showed the
  // learner "HTTP 504: Gateway Timeout" on the membership page.
  it('treats a gateway-rewritten 503 as terminal and reports the real status', () => {
    const r = resolveResponseStatus(res(504, { 'x-do-orig-status': '503' }));
    expect(r.retryable, 'a deliberate refusal must not be retried').toBe(false);
    expect(r.effectiveStatus, 'the learner should not be told about a gateway').toBe(503);
  });

  it('still retries a genuine gateway timeout with no origin header', () => {
    const r = resolveResponseStatus(res(504));
    expect(r.retryable).toBe(true);
    expect(r.effectiveStatus).toBe(504);
  });

  // Narrowed on purpose: a real fault may be transient, so only the proven case changes.
  it('still retries an origin 500, which may be transient', () => {
    const r = resolveResponseStatus(res(502, { 'x-do-orig-status': '500' }));
    expect(r.retryable).toBe(true);
    expect(r.effectiveStatus).toBe(500);
  });

  it('does not retry a client error hidden behind a gateway status', () => {
    const r = resolveResponseStatus(res(504, { 'x-do-orig-status': '401' }));
    expect(r.retryable).toBe(false);
    expect(r.effectiveStatus).toBe(401);
  });

  it('leaves ordinary responses alone', () => {
    expect(resolveResponseStatus(res(200))).toEqual({ effectiveStatus: 200, retryable: false });
    expect(resolveResponseStatus(res(404))).toEqual({ effectiveStatus: 404, retryable: false });
    expect(resolveResponseStatus(res(500))).toEqual({ effectiveStatus: 500, retryable: true });
    // A direct 503 with no rewrite keeps its existing retry behaviour — the header is the only
    // evidence that the application, rather than the platform, chose this answer.
    expect(resolveResponseStatus(res(503))).toEqual({ effectiveStatus: 503, retryable: true });
  });
});
