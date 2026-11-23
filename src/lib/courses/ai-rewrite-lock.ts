/**
 * Courses the AI optimise cron must never rewrite. Their lessons are cited and fact-checked
 * against primary sources (see each course's source register), so an AI rewrite would break
 * the claim-to-source mapping. Held in code so a reseed or a lost DB marker cannot re-enable
 * the rewrite. A course can also opt out per-row with `meta.noAiRewrite: true`.
 *
 * Pure (no Prisma, no network) so non-server code such as the weekly findings triage
 * (`src/lib/triage/findings-course-map.ts`) reads the same lock the optimise cron enforces.
 */
export const AI_REWRITE_DENYLIST_SLUGS: ReadonlySet<string> = new Set([
  'ozone-and-hydroxyl-generators-what-the-evidence-says',
]);

export function isAiRewriteLocked(input: { slug?: string | null; meta: unknown }): boolean {
  if (input.slug && AI_REWRITE_DENYLIST_SLUGS.has(input.slug)) return true;
  const meta = input.meta;
  return (
    !!meta &&
    typeof meta === 'object' &&
    !Array.isArray(meta) &&
    (meta as Record<string, unknown>).noAiRewrite === true
  );
}
