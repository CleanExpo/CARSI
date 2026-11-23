/**
 * GP-760: the session generation rule, in one place. lms_users.session_generation is a counter.
 * Every session token and every reset link carries the generation it was issued under (claim
 * `sg`); a token issued before this rule existed has no claim and counts as generation 0, which is
 * also every user's starting generation. A successful password reset adds one, so every earlier
 * session and link stops matching, while anything issued after the reset carries the new value.
 * A counter, not a time, so two events in the same clock second are still told apart.
 * Pure functions, no imports: shared by the session reader, the admin gate, refresh and /me.
 */

/** The `sg` claim of a decoded token: a non-negative integer, or 0 when absent or malformed. */
export function generationClaim(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** A token is current only while it carries the user's generation now. */
export function isCurrentGeneration(tokenGeneration: number | undefined, userGeneration: number): boolean {
  return (tokenGeneration ?? 0) === userGeneration;
}
