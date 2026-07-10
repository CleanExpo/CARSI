/**
 * AI Front Desk — Phase 1 ships DARK.
 *
 * Margot's streaming + tool-calling path (Vercel-portable OpenRouter SSE with a
 * read-only `find_courses` tool) is gated behind a single env flag so it can be
 * deployed to production without changing any learner-visible behaviour until the
 * founder flips it on.
 *
 * Default (flag absent/off) = the current one-shot JSON assistant, byte-for-byte.
 * Rollback = set the flag off (no data migration — it is purely a transport choice).
 *
 * This is the reference build that later extracts to `@nexus/front-desk` and rolls
 * to the estate; the flag keeps CARSI safe while that capability matures.
 */

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when Margot streams responses and may call front-desk tools. */
export function margotStreamingEnabled(): boolean {
  return envTrue(process.env.MARGOT_STREAMING);
}
