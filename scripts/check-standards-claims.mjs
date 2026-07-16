#!/usr/bin/env node
/**
 * Standards-claim guard — licence-critical (2026-07-15 incident).
 *
 * WHY. A CARSI brand post nearly published "Search the IICRC S520 for the word
 * 'hydroxyl' — it isn't there. Not once. Neither is 'ozone'." FALSE: S520:2024
 * §9.1.7 "Ozone Gas and Other Antimicrobial Devices" names both. The claim came
 * from a WEB-SCRAPED copy ("grep found 0 occurrences"), self-tagged unverified,
 * then promoted to a headline. CARSI's authority IS knowing the standards, so a
 * false claim about a standard is a credibility/licence risk.
 *
 * DESIGN — default-deny, not a blocklist (per adversarial review 2026-07-15).
 * A blocklist of bad phrasings loses to paraphrase, and banning only ABSENCE
 * claims ignores the more dangerous class: fabricated POSITIVE claims ("S520
 * requires ozone") and fake section numbers ("S520 §14.2 prohibits…"). So:
 *
 *   Any sentence that NAMES a standard AND asserts anything about its content
 *   or silence (positive, negative, or numeric) MUST cite a section number that
 *   RESOLVES to a real section in the licensed index below. Otherwise: BLOCKED.
 *
 *   - Absence claims ("does not mention / never / silent on / not found in") are
 *     banned outright — absence cannot be proven from a scrape, and the licensed
 *     index is a table of contents, not full text.
 *   - Positive/numeric content claims must carry a §-citation whose top-level
 *     section exists in the index (a fake §14 fails; S520 has only §1–13).
 *   - Merely NAMING a standard nominatively ("aligned to ANSI/IICRC S500:2021")
 *     with no content assertion is fine.
 *
 * LICENSED SOURCE OF TRUTH. Top-level section numbers below are transcribed from
 * the owner's LICENSED standards (mirrors RestoreAssist lib/standards/*.ts).
 * This file holds section NUMBERS only — never verbatim prose (IICRC IP). Deeper
 * validation (does §9.1.7 actually say X) needs the owner's private full-text
 * store + human sign-off; this guard enforces the mechanical floor.
 *
 * Modes:
 *   node scripts/check-standards-claims.mjs            # scan tracked brand copy (CI + manual)
 *   node scripts/check-standards-claims.mjs --staged   # scan STAGED additions (pre-commit)
 *   node scripts/check-standards-claims.mjs --text "…" # validate a raw string (pre-publish gate)
 *
 * FALSE POSITIVE? Tighten this rule, or add the file to EXEMPT if it merely
 * DESCRIBES the rule (file-level, never directory-level). Do NOT bypass and do NOT
 * weaken the catch: this guard is the only automated check on a licence-critical
 * surface, and its scan runs in CI (ci.yml) since 2026-07-17. Add a case to
 * check-standards-claims.test.mjs so the fix is proven and cannot regress.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Licensed section index — TOP-LEVEL section numbers that EXIST in each standard.
// SSOT mirror of RestoreAssist lib/standards/s520-sections.ts / s500-sections.ts.
const VALID_SECTIONS = {
  S520: new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']),
  S500: new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']),
};

// A finding requires a NAMED IICRC S-standard on the line. Bare "the standard"
// is deliberately NOT a trigger — repo-scale testing showed it fires on the
// English idiom ("has long been the standard for…"), swamping real violations
// with false positives. Precision over recall: catch the licence-critical case
// (a claim naming S500/S520/…), not every sentence containing "standard".
// Repo/staged scan requires a NAMED S-standard (precision at scale). The
// `--text` pre-publish gate ALSO treats "the standard" as a trigger (strict) —
// at the egress moment a false positive is a human-reviewable prompt, not a
// build break, so recall matters more there.
const STD_NUMBERED = /\b(?:ANSI\/)?(?:IICRC[\s-]*)?S\s?5\d0\b/i;
const STD_STRICT = /\b(?:ANSI\/)?(?:IICRC[\s-]*)?S\s?5\d0\b|\bthe standard\b/i;
// A content/silence assertion — verb stems cover -s/-ed/-d/-ing forms and passives.
const CLAIM_VERB =
  /\b(?:mention|contain|say|state|reference|address|cover|include|list|require|mandate|prohibit|ban|forbid|permit|allow|specif|stipulate|dictate|define|treat|classif|omit|lack|ignore|exclude)(?:s|es|ed|d|ing|y|ies)?\b|\bis\s+silent\b|\bdoes\s*n['o]t\b|\bdoesn'?t\b|\bnever\b|\bno\s+(?:mention|reference|occurrence)\b|\bzero\b|\bonly\s+(?:once|twice|\d)\b|\bout\s+of\s+scope\b/i;
const ABSENCE =
  /\b(?:does\s*n['o]t|doesn'?t|do\s*n['o]t|don'?t|never|is\s+silent|are\s+silent|no\s+(?:mention|reference|occurrence|instance)|zero\s+(?:mention|reference|occurrence|instance)|not\s+(?:found|mentioned|present|listed|referenced)\s+in|nowhere\s+in|out\s+of\s+scope|isn'?t\s+(?:there|in\b)|not\s+a\s+single)\b/i;
const SEARCH_GIMMICK = /\bsearch(?:ing)?\s+(?:the\s+)?(?:ANSI\/)?(?:IICRC[\s-]*)?S\s?5\d0\b[^.\n]{0,30}\bfor\b/i;
// A section citation and its top-level number, e.g. "§9.1.7" or "section 12" → "9" / "12".
const SECTION_CITE = /(?:§|section)\s?(\d{1,2})(?:\.\d+)*/i;
// STRONG assertion of regulatory content — soft verbs (cover/include/reference/
// treat) are excluded so legit nominative copy ("aligned to S500 and covering the
// workflow") does not false-positive the uncited-claim rule.
const STRONG_ASSERT =
  /\b(?:require|mandate|prohibit|forbid|ban|permit|allow|specif|stipulate|dictate)(?:s|es|ed|d|ing|y|ies)?\b|\b(?:states?|says?)\s+that\b/i;
// A numeric/count assertion ("references it only twice") is a count-evasion — block if uncited.
const COUNT_CLAIM = /\b(?:only\s+)?(?:once|twice|\d+\s+times?)\b|\bonly\s+\d+\b/i;

// Repo/staged SCAN only: an absence/claim phrase must sit NEAR the standard's name
// to count as an assertion ABOUT that standard. Long prose legitimately pairs an
// unrelated negation with a standard named far away — e.g. "Restoration scoping
// does NOT occur in a vacuum … [206 chars] … introduces IICRC S500" wrongly tripped
// the ABSENCE rule and kept the whole guard red. The `--text` egress gate keeps
// whole-line recall on purpose: there a false positive is a human-reviewable
// prompt, not a build break (see the strict= doc above). Precision at scale, full
// rigour at egress.
const SCAN_PROXIMITY = 120;
function nearStandard(text, re) {
  const m = text.match(STD_NUMBERED);
  if (!m) return false;
  const start = Math.max(0, m.index - SCAN_PROXIMITY);
  const end = m.index + m[0].length + SCAN_PROXIMITY;
  return re.test(text.slice(start, end));
}

function whichStandard(text) {
  const m = text.match(/\bS\s?5(\d)0\b/i);
  if (!m) return null;
  return `S5${m[1]}0`;
}

/**
 * @param strict when true (default — the `--text` PRE-PUBLISH gate) also enforces
 *   the "positive content claim must cite a resolvable section" rule. Repo/staged
 *   scans pass strict=false and enforce only the high-precision rules (absence,
 *   the search gimmick, fabricated section) — the must-cite rule is too broad for
 *   a blanket scan (it fires on the CARSI assistant's own citation logic, course
 *   content and tests that legitimately discuss standards). Precision at scale,
 *   full rigour at the egress moment where a human reviews in context.
 */
function evaluate(text, strict = true) {
  // text = a single line / sentence-ish unit.
  const findings = [];
  const namesStd = (strict ? STD_STRICT : STD_NUMBERED).test(text);
  if (!namesStd) return findings;

  // 1) The search-for-a-word gimmick that invites an unprovable absence claim.
  if (SEARCH_GIMMICK.test(text)) {
    findings.push(
      '"search the standard for the word X" framing is banned (2026-07-15 incident) — it invites an unprovable absence claim. Make a positive, section-cited point.'
    );
    return findings;
  }

  const makesClaim = strict ? CLAIM_VERB.test(text) : nearStandard(text, CLAIM_VERB);
  if (!makesClaim) return findings; // naming a standard without asserting content is fine.

  // 2) Absence claims are banned outright — cannot be proven from the index.
  if (strict ? ABSENCE.test(text) : nearStandard(text, ABSENCE)) {
    findings.push(
      'ABSENCE claim about a standard is banned — absence cannot be verified from the licensed section index (a table of contents, not full text). State what the standard DOES say, cited by section.'
    );
    return findings;
  }

  // 3) A cited section must RESOLVE in the licensed index. Handles the bypasses
  //    CodeRabbit flagged: a cite with no named standard ("the standard §99"),
  //    an unsupported standard ("S540 §14"), and leading-zero normalisation (§09→9).
  const cite = text.match(SECTION_CITE);
  const std = whichStandard(text);
  const asserts = STRONG_ASSERT.test(text) || COUNT_CLAIM.test(text);
  if (cite) {
    const top = String(parseInt(cite[1], 10)); // normalise §09 → "9"
    if (std && VALID_SECTIONS[std]) {
      if (!VALID_SECTIONS[std].has(top)) {
        findings.push(
          `Cited section §${cite[1]} does not exist in ${std} (licensed index has §1–${Math.max(...[...VALID_SECTIONS[std]].map(Number))}). A fabricated section is worse than the original error — verify against lib/standards.`
        );
      }
    } else if (strict && asserts) {
      // cite present but no verifiable standard (unnamed, or unsupported like S540)
      // → cannot resolve the section. Block at the egress moment.
      findings.push(
        'A cited section could not be verified — name the standard (S500/S520) and cite a section that exists in the licensed index (lib/standards). An unverifiable citation is how the 2026-07-15 false claim happened.'
      );
    }
    return findings;
  }

  // 4) PRE-PUBLISH only: an uncited STRONG/positive or count claim about the standard.
  if (strict && asserts) {
    findings.push(
      'A claim about what a standard requires/prohibits/says must cite its section number (§x[.x]) verified against the licensed index (lib/standards) — an uncited assertion is how the 2026-07-15 false claim happened.'
    );
  }
  return findings;
}

const COPY_EXT = /\.(tsx?|jsx?|mdx?|html?|mjs)$/;
const SCANNED_DIRS = ['app/', 'src/', 'templates/', 'docs/marketing/', 'docs/content/', 'public/courses/'];
const JSON_SCANNED_DIRS = ['data/seed/', '.curation/', 'data/wordpress-export/'];
function inScope(file) {
  const norm = file.replace(/\\/g, '/');
  if (COPY_EXT.test(norm) && SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  if (norm.endsWith('.json') && JSON_SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  return false;
}
// Files that DESCRIBE the rule rather than make a claim. Their negations instruct
// the author ("NEVER quote copyrighted IICRC prose verbatim") — they assert nothing
// about a standard's content. FILE-level only, never directory-level: exempting a
// directory would blind the guard across real content (see JSON_SCANNED_DIRS).
const EXEMPT = [
  'scripts/check-standards-claims.mjs',
  'scripts/check-standards-claims.test.mjs',
  'CLAUDE.md',
  'src/lib/course-kit/standards-excerpt.ts',
  'src/lib/course-kit/ai-course-builder-guard.ts',
  'src/lib/server/assistant-prompt.ts',
];
function isExempt(file) {
  const norm = file.replace(/\\/g, '/');
  return EXEMPT.some((e) => norm === e || norm.endsWith('/' + e));
}

export { evaluate, isExempt, inScope, JSON_SCANNED_DIRS, SCANNED_DIRS };

// Only run the scanner when invoked directly (not when imported by the test).
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('check-standards-claims.mjs');
if (!invokedDirectly) {
  // imported for testing — export evaluate() and stop.
} else main();

function main() {
const findings = [];
// NOTE (2026-07-17): sentence-splitting `content` before evaluate() was tried here
// — it is what evaluate()'s "sentence-ish unit" contract implies — and it made the
// scan WORSE (5 findings → 7), because finer units let the proximity window pair a
// standard's name with more unrelated negations. Reverted deliberately; do not
// re-attempt without measuring. The residual false positives are a RULE-scope
// question (see the ABSENCE note in evaluate), not a chunking one.
function scanLine(file, lineNo, content, strict) {
  for (const msg of evaluate(content, strict)) {
    findings.push(`  ${file}:${lineNo}: ${msg}\n    → ${content.trim().slice(0, 140)}`);
  }
}

const argv = process.argv.slice(2);
const textIdx = argv.indexOf('--text');
if (textIdx !== -1) {
  // Pre-publish gate: validate a raw string (any brand copy about to go public).
  const text = argv[textIdx + 1] || '';
  text.split('\n').forEach((line, i) => scanLine('<stdin>', i + 1, line, true));
} else if (argv.includes('--staged')) {
  let diff = '';
  try {
    diff = execSync('git diff --cached --no-color -U0', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    console.error('check-standards-claims: failed to read staged diff:', err.message);
    process.exit(1);
  }
  let currentFile = null;
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    const fm = line.match(/^\+\+\+ b\/(.+)$/);
    if (fm) { currentFile = fm[1]; continue; }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { lineNo = parseInt(hunk[1], 10); continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (!currentFile || !inScope(currentFile) || isExempt(currentFile)) continue;
    scanLine(currentFile, lineNo, line.slice(1), false);
    lineNo++;
  }
} else {
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    console.error('check-standards-claims: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const files = list.split('\n').map((f) => f.trim()).filter((f) => f && inScope(f) && !isExempt(f));
  for (const file of files) {
    let text = '';
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => scanLine(file, i + 1, line, false));
  }
}

if (findings.length > 0) {
  console.error('\n✖ Standards-claim guard failed (2026-07-15 incident)\n');
  console.error('A claim about an IICRC standard must be verified against the LICENSED section index');
  console.error('(lib/standards) and cited by a section that exists — never a scrape, never an absence claim.\n');
  console.error(findings.join('\n'));
  console.error(
    '\nSee CLAUDE.md § "Standards claims" (licence-critical).\n' +
      'Fix the copy: state what the standard DOES say, cited to a section that exists.\n' +
      'Genuine false positive? Tighten the rule, or add the file to EXEMPT in this script\n' +
      'if it only DESCRIBES the rule — then add a case to check-standards-claims.test.mjs.\n' +
      'Do not bypass and do not weaken the catch.\n'
  );
  process.exit(1);
}
console.log('✓ Standards-claim guard passed.');
process.exit(0);
}
