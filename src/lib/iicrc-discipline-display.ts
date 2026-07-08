/** Short labels for homepage / nav pills (matches previous marketing copy where possible). */
export const IICRC_DISCIPLINE_SHORT: Record<string, string> = {
  WRT: 'Water Restoration',
  CRT: 'Carpet Restoration',
  ASD: 'Structural Drying',
  AMRT: 'Microbial Remediation',
  FSRT: 'Fire & Smoke',
  OCT: 'Odour Control',
  CCT: 'Carpet Cleaning',
};

/** Long labels for About / legal-adjacent copy. */
export const IICRC_DISCIPLINE_LONG: Record<string, string> = {
  WRT: 'Water Restoration Technician',
  CRT: 'Carpet Repair and Reinstallation Technician',
  ASD: 'Applied Structural Drying',
  AMRT: 'Applied Microbial Remediation Technician',
  FSRT: 'Fire and Smoke Restoration Technician',
  OCT: 'Odour Control Technician',
  CCT: 'Commercial Carpet Cleaning Technician',
};

/**
 * Official IICRC page per discipline (verified live 2026-07-08: each URL 200s
 * and the page body names the discipline). CRT deliberately points at
 * iicrc.org/rrt/ — IICRC's own /crt/ page is Color Repair Technician, a
 * different discipline; RRT (Repair & Reinstallation) is the page matching
 * CARSI's "Carpet Repair and Reinstallation" node.
 */
export const IICRC_DISCIPLINE_URL: Record<string, string> = {
  WRT: 'https://iicrc.org/wrt/',
  CRT: 'https://iicrc.org/rrt/',
  ASD: 'https://iicrc.org/asd/',
  AMRT: 'https://iicrc.org/amrt/',
  FSRT: 'https://iicrc.org/fsrt/',
  OCT: 'https://iicrc.org/oct/',
  CCT: 'https://iicrc.org/cct/',
};

const DEFAULT_ORDER = ['WRT', 'CRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT'] as const;
const KNOWN_CODES = new Set<string>(DEFAULT_ORDER);

export function normalizeDisciplineCodes(codes: string[]): string[] {
  return codes.flatMap((raw) => {
    const matches = raw.toUpperCase().match(/\b(WRT|CRT|ASD|AMRT|FSRT|OCT|CCT)\b/g);
    return matches ?? [];
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
