/**
 * IICRC CEC banned-phrase scanner for extracted course text (GP-488).
 *
 * The engine runs these over every string it lifts out of a lesson so a bad
 * phrasing in delivered content is surfaced at scaffold time, not at ship time.
 *
 * The patterns MIRROR the release-blocking guard in
 * `scripts/check-iicrc-terminology.mjs` (Linear GP-451). That guard is a plain
 * `node` .mjs script and cannot import this TS module, so the rules are
 * duplicated here deliberately — keep the two lists in sync. This scanner is a
 * REPORTER (it lists hits) and does not replace the guard's release gate.
 */

export interface BannedPhraseRule {
  re: RegExp;
  /** If this also matches, the primary hit is a compliant phrasing (skip it). */
  allow: RegExp | null;
  message: string;
}

export const BANNED_PHRASE_RULES: BannedPhraseRule[] = [
  {
    re: /\bIICRC[\s-]+courses?\b/i,
    allow: /\bIICRC[\s-]+(CEC|Continuing[\s-]+Education[\s-]+Credit)/i,
    message: 'Use "IICRC CEC course(s)", not "IICRC course(s)".',
  },
  {
    re: /\bIICRC[\s-]*(certification|certified)[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI does not deliver IICRC certification courses — say "IICRC CEC course(s)".',
  },
  {
    re: /\b(get|getting|become|becoming|be|earn(?:ing)?)\s+IICRC[\s-]*certified\b/i,
    allow: null,
    message: 'CARSI does not make you "IICRC certified" — it delivers IICRC CEC courses.',
  },
  {
    re: /IICRC[\s-]*certif\w*\s+with\s+CARSI/i,
    allow: null,
    message: 'Do not imply CARSI grants IICRC certification.',
  },
  {
    re: /\bIICRC[\s-]*Accredited\b/i,
    allow: null,
    message: 'Say "IICRC CEC Accredited", never bare "IICRC Accredited".',
  },
  {
    re: /\bIICRC[\s-]*accredited[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI courses are not "IICRC-accredited" — say "IICRC CEC Accredited course(s)".',
  },
  {
    re: /\bIICRC[\s-]+courses?[\s-]+accredit\w*\b/i,
    allow: null,
    message: 'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".',
  },
  {
    re: /\bIICRC[\s-]+Approved[\s-]+(School|Instructor)\b/i,
    allow: /\b(through|via|from|at)\s+(an?\s+)?IICRC[\s-]+approved\s+school\b/i,
    message:
      'CARSI is not an IICRC Approved School or Instructor — never claim that status (it is a separate IICRC licence class).',
  },
  {
    re: /endorsed[\s-]+by[\s-]+(the[\s-]+)?IICRC/i,
    allow: null,
    message: 'The IICRC does not endorse providers — never claim IICRC endorsement.',
  },
  {
    re: /IICRC[\s-]+endorsed/i,
    allow: null,
    message: 'The IICRC does not endorse providers — never claim "IICRC endorsed".',
  },
  {
    re: /IICRC[\s-]+partner(ship)?/i,
    allow: null,
    message: 'CARSI is an approved CEC provider, not an IICRC partner — never claim an IICRC partnership.',
  },
  {
    re: /promoted[\s-]+by[\s-]+(the[\s-]+)?IICRC/i,
    allow: null,
    message: 'The IICRC does not promote any particular educational provider — never claim IICRC promotion.',
  },
  {
    // Founder brand-exclusion rule (2026-07-09): COACH8 must never appear in any
    // CARSI course content or marketing surface.
    re: /\bCOACH[\s-]?8\b/i,
    allow: null,
    message: 'COACH8 is excluded from all CARSI surfaces (founder brand-exclusion rule) — remove it.',
  },
];

export interface BannedPhraseHit {
  text: string;
  message: string;
  /** Optional locator (e.g. lesson id or module title) supplied by the caller. */
  where?: string;
}

/** Scan one string; return every banned-phrase rule it trips. */
export function scanText(text: string, where?: string): BannedPhraseHit[] {
  const hits: BannedPhraseHit[] = [];
  for (const rule of BANNED_PHRASE_RULES) {
    if (rule.re.test(text) && !(rule.allow && rule.allow.test(text))) {
      hits.push({ text: text.slice(0, 160), message: rule.message, where });
    }
  }
  return hits;
}

/** Scan many labelled strings at once. */
export function scanMany(entries: Array<{ text: string; where?: string }>): BannedPhraseHit[] {
  return entries.flatMap((e) => scanText(e.text, e.where));
}
