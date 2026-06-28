import { prisma } from '@/lib/prisma';

/**
 * Per-request "is this user still active?" check (Phase 8, 2026-06-29 audit).
 *
 * LMS sessions are 7-day JWTs with no server-side revocation, so deactivating a
 * user had no effect until the token expired. This adds a lightweight re-check
 * with a short in-process cache so a deactivated/deleted user loses access
 * within the TTL instead of up to 7 days, without a DB hit on every request.
 *
 * Fail-open on DB error (the JWT is already signature-verified; we don't want a
 * transient DB blip to 401 the whole site) — but an explicit "user not found"
 * is treated as inactive (deleted account → revoke).
 */
export const ACTIVE_TTL_MS = 30_000;

interface Entry {
  active: boolean;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

/** Testable core: cache + fail-open policy with injectable clock and fetcher. */
export async function resolveActive(
  userId: string,
  now: number,
  fetcher: (id: string) => Promise<boolean>,
): Promise<boolean> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > now) return hit.active;

  let active: boolean;
  try {
    active = await fetcher(userId);
  } catch (e) {
    console.warn('[auth] isActive re-check failed; allowing (fail-open):', e);
    return true; // do NOT cache a fail-open result — retry next request
  }

  cache.set(userId, { active, expiresAt: now + ACTIVE_TTL_MS });
  return active;
}

/** Clear the cache (tests only). */
export function __clearActiveCache(): void {
  cache.clear();
}

export function isLmsUserActive(userId: string): Promise<boolean> {
  return resolveActive(userId, Date.now(), async (id) => {
    const user = await prisma.lmsUser.findUnique({
      where: { id },
      select: { isActive: true },
    });
    return user?.isActive ?? false; // unknown/deleted user → inactive
  });
}
