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

const DEFAULT_ORDER = ['WRT', 'CRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT'] as const;

/** Order discipline codes for display (known IICRC order first, then remainder sorted). */
export function orderDisciplineCodes(codes: string[]): string[] {
  const set = new Set(codes.map((c) => c.toUpperCase()));
  const primary = DEFAULT_ORDER.filter((c) => set.has(c));
  const rest = [...set]
    .filter((c) => !DEFAULT_ORDER.includes(c as (typeof DEFAULT_ORDER)[number]))
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
