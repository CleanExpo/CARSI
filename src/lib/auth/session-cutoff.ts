/**
 * GP-760: the sessions cut-off rule, in one place. lms_users.sessions_valid_after_sec is a Unix
 * epoch second (the unit of a JWT `iat`). A successful password reset sets it to the reset second
 * and then signs the new session, so the new session passes and every earlier one fails.
 * Pure functions, no imports: shared by the session reader, the admin gate, refresh and /me.
 */

/**
 * lms_users.sessions_valid_after_sec as a number (Prisma returns BIGINT as a bigint; a raw query
 * may return it as a string). Null or unreadable means no cut-off is recorded.
 */
export function cutoffSeconds(value: bigint | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A session issued in or after the cut-off second is current. A token with no iat counts as 0. */
export function issuedWithinCutoff(iat: number | undefined, validAfterSec: number | null): boolean {
  if (validAfterSec === null) return true;
  return (iat ?? 0) >= validAfterSec;
}
