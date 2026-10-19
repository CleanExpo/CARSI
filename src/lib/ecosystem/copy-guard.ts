/**
 * Copy guard for the /ecosystem page, which describes other businesses on CARSI's behalf.
 *
 * Flags, case-insensitively and on word boundaries:
 * - IICRC / CEC / certification / accreditation wording (CLAUDE.md licence rules: never imply a
 *   sister product, or CARSI through it, holds IICRC standing or CEC approval);
 * - superlatives, comparisons and "change the industry" claims (founder: tactful, not rubbing it
 *   in anyone's face);
 * - ownership, partnership or endorsement claims nobody has substantiated;
 * - "coming soon" promises and third-party approval claims;
 * - US spellings. scripts/check-au-english.mjs reads course JSON only, so it never sees this copy.
 *
 * The rules are deliberately phrase-shaped where a bare word has an honest use: "the only" is
 * flagged, "only" is not ("we facilitate the matching process only"); "certified" is flagged,
 * "certificate" is not.
 */

export interface CopyViolation {
  rule: string;
  match: string;
}

const RULES: ReadonlyArray<{ rule: string; re: RegExp }> = [
  { rule: 'IICRC wording', re: /\biicrc\b/i },
  { rule: 'CEC claim', re: /\bcecs?\b/i },
  { rule: 'certification claim', re: /\bcertifi(?:ed|cations?)\b/i },
  { rule: 'accreditation claim', re: /\baccredit\w*/i },
  { rule: 'approval claim', re: /\bapproved\b/i },
  { rule: 'licensing claim', re: /\blicen[cs]ed\b/i },
  { rule: 'guarantee', re: /\bguarantee\w*/i },
  { rule: 'disruption claim', re: /\bdisrupt\w*/i },
  { rule: 'revolution claim', re: /\brevolution\w*/i },
  { rule: 'transformation claim', re: /\btransform\w*/i },
  { rule: 'redefinition claim', re: /\bredefin\w*/i },
  { rule: 'industry-direction claim', re: /\bchange the direction\b/i },
  { rule: 'superiority claim', re: /\bset(?:s|ting)? the standard\b|\braise[sd]? the bar\b/i },
  { rule: 'exclusivity claim', re: /\bthe only\b|#1\b|\bnumber one\b/i },
  { rule: 'superlative', re: /\b(?:leading|best|premier)\b|\bworld[- ]class\b/i },
  { rule: 'comparison', re: /\bunlike\b|\bfinally\b|\bfragmented\b/i },
  { rule: 'disparagement', re: /\b(?:is|are|was|were) broken\b|\bbroken (?:system|industry|model)\b/i },
  { rule: 'relationship claim', re: /\bsister\b|\bpartner(?:s|ship|ships)?\b|\bofficial\b|\bendorse\w*/i },
  { rule: 'future promise', re: /\bcoming soon\b/i },
  { rule: 'third-party recognition claim', re: /\brecogni[sz]ed by\b/i },
  { rule: 'US spelling (colour)', re: /\bcolors?\b/i },
  { rule: 'US spelling (odour)', re: /\bodors?\b/i },
  { rule: 'US spelling (behaviour)', re: /\bbehaviors?\b/i },
  { rule: 'US spelling (mould)', re: /\bmolds?\b/i },
  { rule: 'US spelling (centre)', re: /\bcenters?\b/i },
  { rule: 'US spelling (fibre)', re: /\bfibers?\b/i },
  { rule: 'US spelling (litre)', re: /\bliters?\b/i },
  {
    rule: 'US spelling (-ise)',
    re: /\b(?:organiz|recogniz|prioritiz|optimiz|specializ|realiz|customiz|authoriz|finaliz|minimiz|maximiz|standardiz|categoriz|summariz|utiliz|emphasiz)\w*/i,
  },
  { rule: 'US spelling (-yse)', re: /\b(?:analyz|paralyz|catalyz)\w*/i },
];

/** Every rule the text breaks, with the matched words. Empty means clean. */
export function findCopyViolations(text: string): CopyViolation[] {
  const found: CopyViolation[] = [];
  for (const { rule, re } of RULES) {
    const m = text.match(re);
    if (m) found.push({ rule, match: m[0] });
  }
  return found;
}
