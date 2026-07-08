/** Short labels for homepage / nav pills (matches previous marketing copy where possible). */
export const IICRC_DISCIPLINE_SHORT: Record<string, string> = {
  WRT: 'Water Restoration',
  RRT: 'Carpet Repair',
  ASD: 'Structural Drying',
  AMRT: 'Microbial Remediation',
  FSRT: 'Fire & Smoke',
  OCT: 'Odour Control',
  CCT: 'Carpet Cleaning',
};

/** Long labels for About / legal-adjacent copy. */
export const IICRC_DISCIPLINE_LONG: Record<string, string> = {
  WRT: 'Water Restoration Technician',
  RRT: 'Carpet Repair and Reinstallation Technician',
  ASD: 'Applied Structural Drying',
  AMRT: 'Applied Microbial Remediation Technician',
  FSRT: 'Fire and Smoke Restoration Technician',
  OCT: 'Odour Control Technician',
  CCT: 'Commercial Carpet Cleaning Technician',
};

/**
 * Official IICRC page per discipline (verified live 2026-07-08: each URL 200s
 * and the page body names the discipline). Carpet Repair & Reinstallation is
 * RRT — IICRC's CRT is Color Repair Technician, a different discipline, which
 * is why the legacy CARSI code "CRT" normalizes to RRT below.
 */
export const IICRC_DISCIPLINE_URL: Record<string, string> = {
  WRT: 'https://iicrc.org/wrt/',
  RRT: 'https://iicrc.org/rrt/',
  ASD: 'https://iicrc.org/asd/',
  AMRT: 'https://iicrc.org/amrt/',
  FSRT: 'https://iicrc.org/fsrt/',
  OCT: 'https://iicrc.org/oct/',
  CCT: 'https://iicrc.org/cct/',
};

const DEFAULT_ORDER = ['WRT', 'RRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT'] as const;
const KNOWN_CODES = new Set<string>(DEFAULT_ORDER);

export function normalizeDisciplineCodes(codes: string[]): string[] {
  return codes.flatMap((raw) => {
    const matches = raw.toUpperCase().match(/\b(WRT|RRT|CRT|ASD|AMRT|FSRT|OCT|CCT)\b/g);
    // Legacy alias: stored course categories may still say CRT, which CARSI
    // always used to mean Carpet Repair & Reinstallation (IICRC code RRT).
    return (matches ?? []).map((c) => (c === 'CRT' ? 'RRT' : c));
  });
}

/** Order discipline codes for display (known IICRC order first, then remainder sorted). */
export function orderDisciplineCodes(codes: string[]): string[] {
  const set = new Set(normalizeDisciplineCodes(codes).map((c) => c.toUpperCase()));
  const primary = DEFAULT_ORDER.filter((c) => set.has(c));
  const rest = [...set]
    .filter((c) => !KNOWN_CODES.has(c))
    .sort();
  return [...primary, ...rest];
}

export function disciplinePillsFromCodes(codes: string[]): { code: string; label: string }[] {
  return orderDisciplineCodes(codes).map((code) => ({
    code,
    label: IICRC_DISCIPLINE_SHORT[code] ?? code,
  }));
}

export function disciplineRowsFromCodes(codes: string[]): { code: string; label: string }[] {
  return orderDisciplineCodes(codes).map((code) => ({
    code,
    label: IICRC_DISCIPLINE_LONG[code] ?? code,
  }));
}
