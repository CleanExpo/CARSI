/**
 * IICRC standards — current editions (single source of truth).
 *
 * Licence-critical accuracy: public copy that cites an IICRC S-standard should
 * cite its current edition/year so CARSI's CEC content reads as current. Import
 * from here rather than hard-coding an edition inline, so a standard revision is
 * a one-line change that propagates everywhere.
 *
 * Editions verified first-source against iicrc.org (2026-07-09). The AU adoption
 * of S500 (AS/NZS designation, published Mar-2025) is intentionally not asserted
 * as a formal standard number here until the AS designation is confirmed — see
 * docs/iicrc-compliance.md.
 */

export interface IicrcStandard {
  /** Standard code, e.g. "S500". */
  code: string;
  /** Full title. */
  title: string;
  /** Ordinal edition, e.g. "5th". */
  edition: string;
  /** Publication year of the current edition. */
  year: number;
}

/** Current editions, keyed by code. Update a single entry when a standard is revised. */
export const IICRC_STANDARDS: Record<string, IicrcStandard> = {
  S100: { code: 'S100', title: 'Professional Cleaning of Textile Floor Coverings', edition: '7th', year: 2021 },
  S500: { code: 'S500', title: 'Professional Water Damage Restoration', edition: '5th', year: 2021 },
  S520: { code: 'S520', title: 'Professional Mold Remediation', edition: '4th', year: 2024 },
  S540: { code: 'S540', title: 'Trauma and Crime Scene Cleanup', edition: '2nd', year: 2023 },
  S700: { code: 'S700', title: 'Professional Fire and Smoke Damage Restoration', edition: '1st', year: 2025 },
};

/**
 * Format a standard reference with its current edition/year, e.g.
 * `formatStandard('S520')` → "ANSI/IICRC S520 (4th ed., 2024)".
 * Returns the bare code if the standard is not in the registry.
 */
export function formatStandard(code: string): string {
  const s = IICRC_STANDARDS[code.toUpperCase()];
  if (!s) return code;
  return `ANSI/IICRC ${s.code} (${s.edition} ed., ${s.year})`;
}
