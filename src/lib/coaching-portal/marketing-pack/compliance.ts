/**
 * GP-634: runtime claim filter for member marketing copy (Australian Consumer Law: a claim needs
 * evidence). Member-supplied names and every filled template line go through this before a member
 * sees them; a flagged name is replaced with a neutral fallback, never rewritten silently. Patterns follow the build-time guard in
 * src/lib/marketing/public-claims-guard.test.ts plus earnings, guarantee and outcome claims,
 * and CARSI's IICRC wording rule. Tighten a false positive with a narrower pattern, never by
 * deleting a rule.
 */

export type ComplianceIssue = { rule: string; match: string };

const RULES: { rule: string; pattern: RegExp }[] = [
  // Earnings, income and money-outcome claims.
  {
    rule: 'earnings claim',
    pattern:
      /\b(earn|make|making|save|saving|pocket|bank)\s+(up to\s+|over\s+|an extra\s+|more than\s+)?(\$|aud\s?)\s?\d/i,
  },
  { rule: 'earnings claim', pattern: /\b(earn|make)\s+(more|extra|big)\b/i },
  {
    rule: 'earnings claim',
    pattern:
      /\b(double|triple|10x|grow|boost|increase)\s+your\s+(revenue|income|profits?|sales|earnings)\b/i,
  },
  { rule: 'earnings claim', pattern: /\b(passive|guaranteed|extra)\s+income\b/i },
  // Fail closed: money words a trade post never needs ("earn thousands", "bring in hundreds").
  {
    rule: 'earnings claim',
    pattern:
      /\b(earn|earning|make|making|bring(ing)?\s+in|pull(ing)?\s+in|rake\s+in)\s+(thousands|hundreds|millions|a\s+fortune|a\s+living|good\s+money|serious\s+money|money|cash|\d)/i,
  },
  {
    rule: 'earnings claim',
    pattern: /\b(income|earnings|profits?|revenue|turnover|salary|side\s+hustle|wealth)\b/i,
  },
  { rule: 'savings claim', pattern: /\bsave\s+(you\s+)?(money|thousands|hundreds|cash|\$|\d)/i },
  {
    rule: 'earnings claim',
    pattern: /\$\s?\d[\d,.]*\s*(k|m)?\s*(a|per|\/)\s*(day|week|month|year)\b/i,
  },
  // Guarantees and risk-free promises.
  { rule: 'guarantee claim', pattern: /\bguarantee(d|s)?\b/i },
  { rule: 'guarantee claim', pattern: /\bmoney[- ]back\b/i },
  { rule: 'guarantee claim', pattern: /\brisk[- ]free\b/i },
  {
    rule: 'guarantee claim',
    pattern: /\b100\s?%\s+(satisfaction|success|results?|safe|effective)\b/i,
  },
  // "every time", "every visit", "each clean": a result promised on every job.
  {
    rule: 'outcome claim',
    pattern:
      /\b(every|each)\s+(single\s+)?(time|visit|job|clean|service|booking|call[- ]?out|treatment)\b/i,
  },
  // Absolute result words (fail closed): a finish nobody can promise on every job.
  {
    rule: 'outcome claim',
    pattern:
      /\b(spotless|flawless|perfect(ly)?|immaculate|pristine|stain[- ]free|odou?r[- ]free|mou?ld[- ]free|germ[- ]free|allergen[- ]free)\b/i,
  },
  {
    rule: 'outcome claim',
    pattern:
      /\b(remov(e|es|ing)|eliminat(e|es|ing)|kill(s|ing)?|get(s|ting)?\s+rid\s+of|lift(s|ing)?)\s+(all|every|any)\b/i,
  },
  {
    rule: 'outcome claim',
    pattern:
      /\b(always|guaranteed\s+to|sure\s+to)\s+(remov|eliminat|kill|fix|get|leav|restor|work|solv|lift|clean)/i,
  },
  {
    rule: 'outcome claim',
    pattern: /\b(completely|totally|entirely|fully)\s+(remov|eliminat|clean|gone|restor)/i,
  },
  // Definite outcome promises, whatever the wording (fail closed for generated drafts).
  { rule: 'outcome claim', pattern: /\bpromis(e|es|ed|ing)\b/i },
  {
    rule: 'outcome claim',
    pattern:
      /\b(will|'ll|’ll)\s+(get|see|have|receive|win|look|be|feel|stay|last|never|always|double|triple|save|earn|make|grow|increase|boost)\b/i,
  },
  {
    rule: 'outcome claim',
    pattern:
      /\b\d+\s+(new\s+|more\s+|extra\s+)?(customers|clients|leads|jobs|bookings|enquiries|calls|reviews|sales)\b/i,
  },
  {
    rule: 'outcome claim',
    pattern: /\b(in|within|under)\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i,
  },
  { rule: 'outcome claim', pattern: /\d+(\.\d+)?\s?%/ },
  { rule: 'outcome claim', pattern: /\b(brand[- ]new|like new|good as new)\b/i },
  { rule: 'outcome claim', pattern: /\b(kills?|removes?|eliminates?)\s+\d{2}(\.\d+)?\s?%/i },
  { rule: 'outcome claim', pattern: /\bpermanent(ly)?\s+(fix|remov|result)/i },
  // Superlatives the member cannot substantiate.
  { rule: 'superlative claim', pattern: /\b(number one|no\.\s?1)\b|#1\b/i },
  { rule: 'superlative claim', pattern: /\bindustry[- ]leading\b|\bworld[- ]class\b/i },
  {
    rule: 'superlative claim',
    // "the best carpet cleaner", but not "the best way to".
    pattern:
      /\bthe\s+(best|leading|cheapest|most trusted)\s+(?!(of|way|ways|time|times|thing|things|part|bit)\b)\w+/i,
  },
  // "top-rated", "top ranked"; plain "top" ("the top of the page") is not a claim.
  { rule: 'superlative claim', pattern: /\btop[- ](rated|ranked)\b/i },
  { rule: 'superlative claim', pattern: /\b(cheapest|lowest)\s+(price|prices|rates?|quotes?)\b/i },
  { rule: 'superlative claim', pattern: /\bbest\s+(price|value|in\s+town)\b/i },
  // CARSI IICRC wording rule, fail-closed: a member's generated drafts never name IICRC at all.
  // Any IICRC wording a member wants is written and checked by hand with their coach.
  { rule: 'IICRC mention', pattern: /\bIICRC\b/i },
];

export function findComplianceIssues(text: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const { rule, pattern } of RULES) {
    const m = text.match(pattern);
    if (m) issues.push({ rule, match: m[0] });
  }
  return issues;
}

export function isCompliantCopy(text: string): boolean {
  return findComplianceIssues(text).length === 0;
}
