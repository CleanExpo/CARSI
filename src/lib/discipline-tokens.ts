/**
 * Discipline design-token map (GP-335 PR 1/4).
 *
 * Single source of truth bridging IICRC acronyms → the new
 * `--discipline-*` CSS var namespace. Components should consume
 * `disciplineToken(code)` instead of hard-coding hex values.
 *
 * Base HSL values live in `app/globals.css`. Tailwind utilities
 * (e.g. `bg-discipline-water-500`) are generated from the same vars
 * via `tailwind.config.ts`.
 */

export type DisciplineSlug =
  | 'water'
  | 'carpet'
  | 'drying'
  | 'odour'
  | 'commercial'
  | 'fire'
  | 'microbial'
  | 'mould'
  | 'biohazard';

export type DisciplineShade =
  | '50' | '100' | '200' | '300' | '400'
  | '500' | '600' | '700' | '800' | '900' | '950';

/** IICRC acronym → canonical discipline slug. */
export const DISCIPLINE_CODE_TO_SLUG: Record<string, DisciplineSlug> = {
  WRT: 'water',
  CRT: 'carpet',
  ASD: 'drying',
  OCT: 'odour',
  CCT: 'commercial',
  FSRT: 'fire',
  AMRT: 'microbial',
};

/**
 * Return a `hsl(var(--discipline-<slug>-<shade>))` string for inline styles.
 * Returns null for unknown codes so callers can fall back.
 */
export function disciplineToken(
  code: string | null | undefined,
  shade: DisciplineShade = '500',
): string | null {
  if (!code) return null;
  const slug = DISCIPLINE_CODE_TO_SLUG[code.toUpperCase()];
  if (!slug) return null;
  return `hsl(var(--discipline-${slug}-${shade}))`;
}

/**
 * Direct slug → CSS var lookup (for components that already know the slug).
 */
export function disciplineTokenBySlug(
  slug: DisciplineSlug,
  shade: DisciplineShade = '500',
): string {
  return `hsl(var(--discipline-${slug}-${shade}))`;
}

/**
 * Tailwind class fragment for a discipline — e.g. `disciplineClass('WRT', 'bg', 500)`
 * returns `bg-discipline-water-500`.
 */
export function disciplineClass(
  code: string | null | undefined,
  utility: 'bg' | 'text' | 'border' | 'ring' | 'from' | 'to' | 'via',
  shade: DisciplineShade = '500',
): string | null {
  if (!code) return null;
  const slug = DISCIPLINE_CODE_TO_SLUG[code.toUpperCase()];
  if (!slug) return null;
  return `${utility}-discipline-${slug}-${shade}`;
}
