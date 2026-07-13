import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

/**
 * Shared cron authentication (WS5). FAIL CLOSED: when CRON_SECRET is unset/blank the
 * route returns 503 and never runs — so an `Authorization: Bearer undefined` header
 * can no longer match an empty secret (the original bug). The token compare is
 * constant-time (sha256 digests + timingSafeEqual), mirroring ccw-unlock.ts.
 */
export type CronAuthDecision =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string };

function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a, 'utf8').digest();
  const db = createHash('sha256').update(b, 'utf8').digest();
  return da.length === db.length && timingSafeEqual(da, db);
}

/** Pure decision core — unit-testable without a request/response. */
export function decideCronAuth(
  authHeader: string | null,
  secret: string | undefined,
): CronAuthDecision {
  const s = secret?.trim();
  if (!s) {
    return { ok: false, status: 503, message: 'Cron not configured' };
  }
  const header = authHeader ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (token.length > 0 && constantTimeEqual(token, s)) {
    return { ok: true };
  }
  return { ok: false, status: 401, message: 'Unauthorized' };
}

/**
 * Guard a cron route: `const denied = requireCron(request); if (denied) return denied;`.
 * Returns a NextResponse to short-circuit on failure, or null when authorised.
 */
export function requireCron(request: Request): NextResponse | null {
  const decision = decideCronAuth(request.headers.get('authorization'), process.env.CRON_SECRET);
  return decision.ok ? null : new NextResponse(decision.message, { status: decision.status });
}
