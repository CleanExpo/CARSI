// src/lib/rate-limit-distributed.ts
//
// Distributed (cross-instance) rate limiter backed by Upstash Redis over its
// REST API — no SDK dependency, just fetch. This upgrades the in-process
// limiter in `rate-limit.ts`, whose window resets per serverless cold start,
// to a globally consistent fixed-window counter.
//
// Configure with UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. When those
// are absent — or a KV request fails — it falls back to the in-process limiter
// so the endpoint always keeps a best-effort limit (fail-safe, never 500s).

import { applyRateLimit, type RateLimitResult } from '@/lib/rate-limit';

const REST_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

/** True when Upstash Redis REST credentials are configured. */
export function isDistributedRateLimitConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

/**
 * Fixed-window rate limit. Uses Upstash Redis (REST) when configured, else the
 * in-process limiter. Returns the same shape as `applyRateLimit`.
 */
export async function applyRateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!REST_URL || !REST_TOKEN) {
    return applyRateLimit(key, limit, windowMs);
  }

  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const windowKey = `rl:${key}:${bucket}`;
  const resetAt = (bucket + 1) * windowMs;

  try {
    // Atomic-ish per key: INCR the window counter, then set its TTL only if the
    // key is new (NX) so the window doesn't slide on every hit.
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', windowKey],
        ['PEXPIRE', windowKey, windowMs, 'NX'],
      ]),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Upstash REST responded ${res.status}`);
    }

    const data = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = data?.[0]?.result;
    if (typeof count !== 'number') {
      throw new Error('Upstash REST: missing INCR result');
    }

    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (err) {
    console.error('[rate-limit] distributed limiter failed; falling back to in-process:', err);
    return applyRateLimit(key, limit, windowMs);
  }
}
