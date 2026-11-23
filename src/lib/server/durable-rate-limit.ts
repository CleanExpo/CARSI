import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { applyRateLimit, type RateLimitResult } from '@/lib/rate-limit';

/**
 * GP-760: fixed-window rate limit held in Postgres (auth_rate_limits), for the auth endpoints.
 *
 * The in-process limiter (src/lib/rate-limit.ts) resets on every deploy and counts per instance
 * (app.yaml runs more than one). This one is shared by every instance and survives deploys. It is
 * one atomic statement: insert the key, or bump its count, or restart its window when the old
 * window has ended, and return the new count.
 *
 * Keys are stored as SHA-256 hex of the caller's key ("<bucket>:<ip or email>"), so no IP address
 * or email is kept in clear. Expired rows are pruned occasionally from the request path.
 *
 * If the database is not configured or the statement fails, it falls back to the in-process
 * limiter with the same key, limit and window, so a DB outage weakens the limit to the old
 * behaviour instead of removing it.
 */

const PRUNE_EVERY = 200;
const PRUNE_GRACE_MS = 24 * 60 * 60 * 1000;
let callsSincePrune = 0;

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function pruneExpired(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "auth_rate_limits"
       WHERE "reset_at" < now() - (${PRUNE_GRACE_MS}::double precision * interval '1 millisecond')`;
  } catch {
    // Housekeeping only; a later call retries.
  }
}

export async function applyDurableRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!process.env.DATABASE_URL?.trim()) return applyRateLimit(key, limit, windowMs);

  try {
    // Times stay in SQL (now()) and come back as epoch milliseconds: no JS Date crosses the driver,
    // so the database session's time zone cannot shift a window.
    const rows = await prisma.$queryRaw<Array<{ count: number; reset_ms: number }>>`
      INSERT INTO "auth_rate_limits" ("key", "count", "reset_at")
      VALUES (${hashKey(key)}, 1, now() + (${windowMs}::double precision * interval '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "auth_rate_limits"."reset_at" <= now()
                       THEN 1 ELSE "auth_rate_limits"."count" + 1 END,
        "reset_at" = CASE WHEN "auth_rate_limits"."reset_at" <= now()
                          THEN EXCLUDED."reset_at" ELSE "auth_rate_limits"."reset_at" END
      RETURNING "count", (extract(epoch FROM "reset_at") * 1000)::float8 AS "reset_ms"`;
    const row = rows[0];
    if (!row) throw new Error('auth_rate_limits upsert returned no row');

    callsSincePrune += 1;
    if (callsSincePrune >= PRUNE_EVERY) {
      callsSincePrune = 0;
      void pruneExpired();
    }

    const count = Number(row.count);
    const resetAt = Number(row.reset_ms);
    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (e) {
    console.warn(
      '[rate-limit] durable store unavailable; using in-process limit:',
      e instanceof Error ? e.message : String(e)
    );
    return applyRateLimit(key, limit, windowMs);
  }
}

/** Retry-After header value (whole seconds, at least 1) for a limited request. */
export function retryAfterSeconds(resetAt: number): string {
  return String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
}
