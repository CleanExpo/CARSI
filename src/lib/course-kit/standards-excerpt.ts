/**
 * IICRC standards verbatim-excerpt heuristic (cite-density check).
 *
 * Licence-critical (CLAUDE.md § "IICRC standards IP + AI use"): IICRC standards are
 * copyright-protected, and the IICRC's published AI Use Policy prohibits entering its
 * standards into AI tooling and creating AI derivatives of them. CARSI courses may
 * reference a standard nominatively ("aligned to ANSI/IICRC S500:2021") but must never
 * reproduce its text beyond a brief, attributed reference.
 *
 * This is a REPORTER, like the banned-phrase scanner: it flags lesson text that LOOKS
 * like a pasted standard excerpt so a human clears it before ship. Heuristic: the text
 * names an IICRC S-standard AND shows the cite-density signature of standard body text —
 * clustered clause numbering (e.g. "12.3.4", "Section 4.2") and/or repeated normative
 * "shall" language, which authored course prose essentially never has.
 */

/** Mentions an IICRC S-standard (S100/S220/S300/S500/S520/S540/S590 …). */
const STANDARD_MENTION = /\b(?:ANSI\s*\/\s*)?IICRC\s*\/?\s*S\s*-?\d{3}\b|\bANSI\/IICRC\b/i;

/** Deep clause numbers ("12.3.4") — measurement decimals ("2.5 m") have one dot, not two. */
const CLAUSE_NUMBER = /\b\d{1,2}\.\d{1,2}\.\d{1,3}\b/g;

/** Explicit section citations ("Section 4.2", "§ 12.3"). */
const SECTION_CITE = /(?:\bSection|§)\s*\d{1,2}(?:\.\d{1,2})*/gi;

/** Normative requirement language characteristic of standard body text. */
const NORMATIVE_SHALL = /\bshall\b/gi;

/** Minimum text length before the heuristic applies (short blurbs cannot be excerpts). */
const MIN_LENGTH = 280;

export interface StandardExcerptHit {
  /** Caller-supplied locator (e.g. lesson id / module title). */
  where?: string;
  reason: string;
  /** First 200 characters of the offending text for triage. */
  sample: string;
}

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

/**
 * Scan one extracted text block. Returns a hit when the block names an IICRC standard
 * and carries standard-body cite density; null otherwise.
 */
export function scanTextForStandardExcerpt(
  text: string,
  where?: string
): StandardExcerptHit | null {
  if (!text || text.length < MIN_LENGTH) return null;
  if (!STANDARD_MENTION.test(text)) return null;

  const clauseNumbers = countMatches(text, CLAUSE_NUMBER);
  const sectionCites = countMatches(text, SECTION_CITE);
  const shallCount = countMatches(text, NORMATIVE_SHALL);

  const citeCount = clauseNumbers + sectionCites;
  const reasons: string[] = [];
  if (citeCount >= 3) {
    reasons.push(`${citeCount} clause/section citations`);
  }
  if (shallCount >= 3) {
    reasons.push(`${shallCount} normative "shall" clauses`);
  }
  if (reasons.length === 0) return null;

  return {
    where,
    reason:
      `Possible verbatim IICRC standard excerpt (${reasons.join(' + ')} alongside an ` +
      'S-standard mention). Standards are copyright-protected — reference them nominatively, ' +
      'never reproduce their text (CLAUDE.md § "IICRC standards IP + AI use").',
    sample: text.slice(0, 200),
  };
}

/** Scan many labelled text blocks at once. */
export function scanManyForStandardExcerpts(
  entries: Array<{ text: string; where?: string }>
): StandardExcerptHit[] {
  const hits: StandardExcerptHit[] = [];
  for (const e of entries) {
    const hit = scanTextForStandardExcerpt(e.text, e.where);
    if (hit) hits.push(hit);
  }
  return hits;
}
