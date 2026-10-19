import { IICRC_CODE_ALT } from './iicrc-codes';

/**
 * THESE TWO MAPS DO DIFFERENT JOBS. Do not make them agree.
 *
 * SHORT holds CARSI's own plain-English TOPIC names. Its purpose is to REPLACE an IICRC
 * acronym on a CARSI surface, so a CARSI course shows "Water Restoration" and never "WRT"
 * (see CourseTextThumbnail.tsx, which fails closed and renders nothing for an unmapped code).
 * These are deliberately NOT the IICRC designation names — using the issuer's exact designation
 * to label a CARSI course is the branding CLAUDE.md's founder ruling of 2026-07-10 bans.
 *
 * LONG holds the IICRC's OWN designation names, for third-person reference ("FSRT is an IICRC
 * certification covering…"), which that same ruling expressly permits. Because these name a
 * third party's credential, they must be quoted EXACTLY as the issuer writes them and may never
 * be adjusted for house style.
 */

/** CARSI's plain-English topic labels. Never IICRC designation names — see the note above. */
export const IICRC_DISCIPLINE_SHORT: Record<string, string> = {
  WRT: 'Water Restoration',
  // CARSI sells no colour-repair course; a legacy CRT-coded course is a carpet course.
  CRT: 'Carpet Cleaning',
  ASD: 'Structural Drying',
  AMRT: 'Microbial Remediation',
  FSRT: 'Fire & Smoke',
  OCT: 'Odour Control',
  CCT: 'Carpet Cleaning',
};

/**
 * Official IICRC designation names. VERIFIED against the issuer's own certifications page,
 * https://iicrc.org/iicrccertifications/, fetched 2026-09-07. Locked by
 * `iicrc-discipline-display.test.ts` so they cannot drift again.
 *
 * Six of these seven were wrong before that check, and the errors were not typos:
 *   - WRT was missing "Damage".
 *   - CRT carried RRT's name. CRT is COLOR Repair Technician; RRT is Carpet Repair and
 *     Reinstallation Technician. CARSI sells neither, and a page badging CRT as carpet repair
 *     was advertising a course that does not exist.
 *   - Two further codes were missing words from their designation names.
 *   - CCT was called "Commercial Carpet Cleaning Technician", which conflates it with CCMT,
 *     Commercial Carpet Maintenance Technician — a real and separate IICRC designation.
 *
 * "Odor" is the issuer's spelling of their own credential. It stays American deliberately:
 * this is a proper noun, and re-spelling a third party's certification name to house style
 * would make the citation inaccurate. Australian spelling belongs in SHORT above, which is
 * CARSI's own wording.
 */
export const IICRC_DISCIPLINE_LONG: Record<string, string> = {
  WRT: 'Water Damage Restoration Technician',
  CRT: 'Color Repair Technician',
  ASD: 'Applied Structural Drying Technician',
  AMRT: 'Applied Microbial Remediation Technician',
  FSRT: 'Fire and Smoke Damage Restoration Technician',
  OCT: 'Odor Control Technician',
  CCT: 'Carpet Cleaning Technician',
};

/** CARSI's taught subject codes, in display order: the keys of the topic map above. */
export const CARSI_SUBJECT_CODES: readonly string[] = Object.keys(IICRC_DISCIPLINE_SHORT);
const DEFAULT_ORDER = CARSI_SUBJECT_CODES;
const KNOWN_CODES = new Set<string>(DEFAULT_ORDER);

export function normalizeDisciplineCodes(codes: string[]): string[] {
  return codes.flatMap((raw) => {
    const matches = raw.toUpperCase().match(new RegExp(`\\b(${DEFAULT_ORDER.join('|')})\\b`, 'g'));
    return matches ?? [];
  });
}

/** Order discipline codes for display (known IICRC order first, then remainder sorted). */
export function orderDisciplineCodes(codes: string[]): string[] {
  const set = new Set(normalizeDisciplineCodes(codes).map((c) => c.toUpperCase()));
  const primary = DEFAULT_ORDER.filter((c) => set.has(c));
  const rest = [...set].filter((c) => !KNOWN_CODES.has(c)).sort();
  return [...primary, ...rest];
}

export function disciplinePillsFromCodes(codes: string[]): { code: string; label: string }[] {
  return orderDisciplineCodes(codes).map((code) => ({
    code,
    label: IICRC_DISCIPLINE_SHORT[code] ?? code,
  }));
}

/**
 * Every IICRC certification / designation code: the shared list (data/iicrc-codes.json), so a code
 * added there is suppressed here too (review of 08d15553: this was a literal copy).
 */
export const ALL_IICRC_CODES = IICRC_CODE_ALT;

/**
 * The CARSI topic to print for a course, pathway or idea's discipline code — never the code.
 * Unknown codes render nothing (fail closed).
 */
export function disciplineTopicLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return IICRC_DISCIPLINE_SHORT[code.trim().toUpperCase()] ?? null;
}

/**
 * A pathway's free-text target, safe to print on a CARSI surface: null when it names the IICRC,
 * a certification, or an IICRC code, because a CARSI pathway never builds toward IICRC
 * certification (CLAUDE.md). The field is database data, so this fails closed.
 */
export function publicPathwayTarget(target: string | null | undefined): string | null {
  const t = target?.trim();
  if (!t) return null;
  if (/IICRC|certif/i.test(t) || new RegExp(`\\b(?:${ALL_IICRC_CODES})\\b`, 'i').test(t))
    return null;
  return t;
}

export function disciplineRowsFromCodes(codes: string[]): { code: string; label: string }[] {
  return orderDisciplineCodes(codes).map((code) => ({
    code,
    label: IICRC_DISCIPLINE_LONG[code] ?? code,
  }));
}
