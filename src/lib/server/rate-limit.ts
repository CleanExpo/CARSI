/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This is effective for single-instance deployments. For multi-instance
 * or serverless environments (Vercel, Railway scale-out) use a Redis-backed
 * solution such as @upstash/ratelimit to share state across instances.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Check whether the given key is within the allowed rate.
 *
 * @param key      Unique identifier for the caller (e.g. IP address).
 * @param limit    Maximum number of requests allowed per window.
 * @param windowMs Length of the sliding window in milliseconds.
 * @returns true if the request is allowed, false if it should be rejected.
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}
