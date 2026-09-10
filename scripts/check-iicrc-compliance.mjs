#!/usr/bin/env node
/**
 * IICRC / CEC compliance guard (licence-critical) — the systemic backstop.
 *
 * WHY THIS EXISTS. CARSI is accredited as an IICRC *CEC provider*. It does NOT grant IICRC
 * certification, and a course may only advertise CEC hours after the founder confirms IICRC
 * approval. Two failure modes recurred (truckmount incident + the 22-course CEC-inference
 * trap):
 *   1. IICRC/CEC framing templated onto courses that are not IICRC-related.
 *   2. Specific CEC-hour claims made for courses the IICRC has not approved.
 * The older `check-iicrc-terminology.mjs` scanned only app/src/templates/docs-marketing and
 * only a few selling phrasings, so course-content (data/**, public/courses/**) and whole
 * classes of claim ("IICRC-approved", "get certified with CARSI", "N IICRC CEC hours") slipped
 * through. This guard closes both the scope gap and the rule gap. It runs in CI.
 *
 *   node scripts/check-iicrc-compliance.mjs            # scan tracked content (CI + manual)
 *
 * A CEC hour claim is only legitimate once the founder sets an explicit positive `cecHours`
 * on the course AND adds the course slug to CEC_APPROVED_SLUGS below.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Founder-approved IICRC-CEC course slugs — read from the CEC approvals registry
 *  (`data/seed/cec-approvals.json`, the SSOT; validated by `npm run check:cec`).
 *  A course enters this list ONLY via a registry entry with status "approved" — that is
 *  the ONLY way a specific CEC-hour claim for it passes this guard. Fail-closed: a
 *  missing/unreadable registry yields an empty list (every CEC-hour claim flagged). */
const CEC_APPROVED_SLUGS = loadApprovedSlugsFromRegistry();

function loadApprovedSlugsFromRegistry() {
  const registryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'data',
    'seed',
    'cec-approvals.json'
  );
  try {
    const parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
    if (!Array.isArray(parsed?.approvals)) return [];
    return parsed.approvals
      .filter((e) => e && e.status === 'approved' && typeof e.slug === 'string' && e.slug.trim())
      .map((e) => e.slug.trim());
  } catch {
    return [];
  }
}

/** The institutions the IICRC genuinely approves. "IICRC-approved school" describes a third
 *  party and is legitimate; "IICRC-approved school courses" is a CARSI offering and is exactly
 *  what the rule bans - the noun has stopped being the head of the phrase and become a modifier. */
const IICRC_INSTITUTION = String.raw`(?:schools?|examinations?|exams?|instructors?)`;

/** Connectors that join one institution noun to ANOTHER ("schools and examinations",
 *  "school's examination", "School/Instructor"). Exported so the test suite generates its
 *  attack frames from the SAME list the pattern is built from: adding a connector here
 *  automatically generates the attacks against it, instead of relying on someone remembering
 *  to hand-write a case. v3 exists because that gap was real - v2's generator used one
 *  institution noun per frame, so it never produced `school's examination courses`, and the
 *  pattern had the matching gap. */
export const IICRC_INSTITUTION_CONNECTORS = [
  { pattern: String.raw`\s+(?:and|or)\s+(?:(?:its|their|the|an?)\s+)?`, samples: [' and ', ' or ', ' and its '] },
  { pattern: String.raw`\s*['’]s\s+`, samples: ["'s ", '’s '] },
  { pattern: String.raw`\s*/\s*`, samples: ['/', ' / '] },
];

/** What may follow the institution noun phrase once it is COMPLETE. Terminators only - a
 *  connector is not a terminator, it continues the chain and the chain must still terminate.
 *
 *  `'`/`’` terminate only when NOT possessive: `school's examination` is a real IICRC
 *  examination, `school's training programs` is a CARSI offering wearing an apostrophe.
 *
 *  A bare preposition (`at`) was a terminator in v2 and is deliberately NOT one here. It left
 *  everything after it unjudged, so `Our IICRC-approved school at examination courses get you
 *  certified.` - round 1's payload, one preposition later - passed. It re-enters only as a
 *  bounded connector, if live copy ever needs it; nothing on the tree does today. */
const IICRC_PHRASE_TERMINATORS = [
  String.raw`\s*$`,                    // end of the scan window
  String.raw`\s*["”.,;:!?)\]}<{&—–]`, // punctuation / markdown / JSX boundary
  String.raw`\s*['’](?!s)`,       // quote, but never possessive
  String.raw`\s+-\s`,                  // spaced hyphen, not school-based
];

/** SAFE-SET PARTITION (v3, 2026-09-10). Enumerate what is SAFE, never what breaks.
 *
 *  Three independent review rounds shaped this. v1 allowed an institution noun then excluded
 *  the one offering noun review had used (`(?!\s+courses?\b)`); round 2 walked past it with
 *  `training`, and probing showed `programs`, `workshops`, `classes` and `course of study` had
 *  been through all along, on ONE line, since before the wrap window existed. Enumerating what
 *  BREAKS fails open forever: there is always another noun.
 *
 *  v2 inverted it, but judged only the FIRST institution noun, so round 3 reached an offering
 *  noun through a connector: `school's examination courses`, `school and examination courses`,
 *  `school/examination courses`.
 *
 *  v3 states the invariant the previous two versions each half-held: NO SPAN AFTER THE LAST
 *  INSTITUTION NOUN IS LEFT UNJUDGED. The allow admits a CHAIN of institution nouns joined by
 *  connectors, and the chain must then TERMINATE. An offering noun terminates nothing, so it
 *  blocks at any depth without this pattern ever naming it - `school`, `school's examination`
 *  and `school and its examination` all have to end the same way. A follower nobody anticipated
 *  over-blocks (CI red, add it after review) rather than failing open.
 *
 *  KNOWN LIMIT (documented, not hidden - GP-583). A bare possessive claim with no offering noun,
 *  `Our IICRC-approved school.`, still passes: whether "our" makes the school CARSI's own is a
 *  question about free prose, not about this phrase.
 *  KNOWN LIMIT (GP-584). Every rule here is line-wide - an allow anywhere on the line excuses a
 *  ban anywhere else on it, so a legitimate "CEC provider" sentence sharing a line with a
 *  violation suppresses it. Architectural, predates this rule, affects all of BANNED.
 */
const IICRC_INSTITUTION_CHAIN =
  IICRC_INSTITUTION + String.raw`\b` +
  String.raw`(?:(?:` + IICRC_INSTITUTION_CONNECTORS.map((c) => c.pattern).join('|') + String.raw`)` +
  IICRC_INSTITUTION + String.raw`\b)*` +
  String.raw`(?=` + IICRC_PHRASE_TERMINATORS.join('|') + String.raw`)`;

/** Allow for the bare-"IICRC-approved" rule: a COMPLETE institution noun phrase, or one of the
 *  cores that are true of CARSI under any surrounding prose (board approval, CE/CEC provider
 *  standing). `course of study` was removed in v2 - it appears nowhere on the tree and
 *  `Our IICRC-approved course of study` was a straight hole. */
const IICRC_APPROVED_ALLOW = new RegExp(
  String.raw`\bIICRC[\s-]*approved\s+` + IICRC_INSTITUTION_CHAIN +
  String.raw`|IICRC[\s-]*board[\s-]*approv` +
  String.raw`|(CE|CEC)[\s-]*provider` +
  String.raw`|IICRC[\s-]*approv\w*\s+CE\b`,
  'i'
);

const BANNED = [
  { re: /\bIICRC[\s-]+courses?\b/i, allow: /\bIICRC[\s-]+(CEC|Continuing[\s-]+Education[\s-]+Credit)/i,
    message: 'Use "IICRC CEC course(s)", not "IICRC course(s)".' },
  { re: /\bIICRC[\s-]*(certification|certified)[\s-]+courses?\b/i, allow: null,
    message: 'CARSI does not deliver IICRC certification courses — say "IICRC CEC course(s)".' },
  { re: /\b(get|getting|become|becoming|be|earn(?:ing)?)\s+IICRC[\s-]*certified\b/i, allow: null,
    message: 'CARSI does not make you "IICRC certified" — it delivers IICRC CEC courses.' },
  { re: /IICRC[\s-]*certif\w*\s+with\s+CARSI/i, allow: null,
    message: 'Do not imply CARSI grants IICRC certification.' },
  { re: /\bIICRC[\s-]*Accredited\b/i, allow: /\bIICRC[\s-]+CEC[\s-]+Accredited\b/i,
    message: 'Say "IICRC CEC Accredited", never bare "IICRC Accredited".' },
  { re: /\bIICRC[\s-]*accredited[\s-]+courses?\b/i, allow: null,
    message: 'Not "IICRC-accredited course(s)" — say "IICRC CEC Accredited course(s)" (even in a negated disclaimer, write "not IICRC CEC accredited").' },
  { re: /\bIICRC[\s-]+courses?[\s-]+accredit\w*\b/i, allow: null,
    message: 'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".' },
  // GAP CLOSED — "IICRC-approved" as a CARSI offering. Legitimate uses (real IICRC schools /
  // exams / the CE-provider program / board-approval process) are allowed — see
  // IICRC_APPROVED_ALLOW for why the institution noun must be a COMPLETE noun phrase.
  { re: /\bIICRC[\s-]*approved\b/i,
    allow: IICRC_APPROVED_ALLOW,
    message: 'Bare "IICRC-approved" implies IICRC approves CARSI\'s courses/certifications — say "IICRC CEC Accredited".' },
  // GAP CLOSED — "get / certified ... with CARSI" without IICRC adjacency.
  { re: /\b(get|gain|become|be)\s+certified\b[^.\n]{0,24}\bwith\s+CARSI\b/i, allow: null,
    message: 'CARSI delivers IICRC CEC training, not certification — do not say "get certified with CARSI".' },
  { re: /\bcertified\s+online\s+with\s+CARSI\b/i, allow: null,
    message: 'CARSI delivers IICRC CEC training, not certification — reframe "certified online with CARSI".' },
];

/** A specific IICRC-CEC hour claim on a course (e.g. "8 IICRC CECs", "5 IICRC CEC hours",
 *  "4 IICRC Continuing Education Credits", "(CEC): 3 Hours"). This is the static marketing-prose
 *  form the founder rule bans on any course the IICRC has not approved — the licence exposure.
 *
 *  BLOCK-BY-DEFAULT + EXPLICIT HUMAN ALLOWLIST (see scanLine). Terminal design decision (v8): the
 *  guard makes NO attempt to auto-classify free prose as a "genuine requirement fact". Seven
 *  successive regex exemptions (maintain-clause, bare-recertification, award-verb denylist,
 *  requirement-token allowlist, contiguous forms, per-occurrence span-coverage) were each defeated
 *  by a new prose construction — a regex over free prose is the wrong control for a licence-critical
 *  gate. Instead: EVERY numbered "N IICRC CEC(s)" occurrence on a non-approved surface is a finding,
 *  UNLESS the line's exact normalised text is present in an explicit, human-maintained allowlist
 *  (`scripts/iicrc-cec-allowlist.json`, defaulting EMPTY). Exact string match only — no pattern, no
 *  fuzzy, no wildcard — so a near-miss variant still blocks and no prose construction can smuggle a
 *  claim through. The only way a numbered IICRC-CEC claim ships is a human putting its exact text in
 *  the allowlist; that human review IS the control. Fail-closed: an empty/unreadable allowlist
 *  blocks every numbered-CEC line. (Separately, CEC_APPROVED_SLUGS still exempts files under a
 *  founder-approved course slug via the CEC approvals registry — that path is untouched.)
 *
 *  On the live tree there are ZERO numbered IICRC-CEC lines, so the allowlist ships empty and
 *  nothing legitimate is blocked today. A future genuine program-requirement line is added, verbatim
 *  and human-reviewed, to the allowlist file.
 *
 *  KNOWN LIMIT (documented, not hidden): a reordered claim where the number binds to "CEC(s)" but
 *  "IICRC" is NOT the immediately-preceding token (e.g. "earns 4 CECs recognised by the IICRC") is
 *  not matched by `re`. Binding any nearby number to "CEC" was tried and rejected: on the current
 *  tree it produced only false positives (learner CEC-tracking badges "10 CECs Earned" — a
 *  student's own tracking is explicitly allowed by CLAUDE.md; the CEC calculator's requirement
 *  math "21 CECs as a Master"; ticket refs "GP-498 CEC"; code comments "0 CEC"), and no true
 *  positive, so it over-reached. CARSI's authored copy always writes "IICRC …(CEC)" adjacent. */
const CEC_NUMBER = {
  re: /\b\d+(?:\.\d+)?\s*IICRC\s+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)|\((?:IICRC\s+)?CEC\)\s*:?\s*\d+(?:\.\d+)?\s*Hours?/i,
  // Marks this rule as gated by the exact-text allowlist (see scanLine) rather than a regex `allow`.
  allowlisted: true,
  message: 'Specific IICRC CEC-hour claim on a non-approved course. Every numbered "N IICRC CEC(s)" claim is blocked by default; it ships ONLY if a human adds the line\'s exact text to scripts/iicrc-cec-allowlist.json (approvedLines) after review, or the file sits under a founder-approved course slug (data/seed/cec-approvals.json). No pattern/auto-exemption — a near-miss still blocks. If this is a genuine IICRC program-requirement fact, add the exact line to the allowlist; if it is a course-award claim, remove the CEC number (fail-closed, CLAUDE.md).',
};

/** Normalise a line for exact allowlist comparison: trim ends, collapse internal whitespace runs.
 *  Deliberately conservative — case and wording are preserved, so a near-miss variant does NOT
 *  match an allowlisted line (no accidental wildcarding). */
function normaliseLine(s) { return s.replace(/\s+/g, ' ').trim(); }

/** Load the human-maintained exact-line allowlist (`scripts/iicrc-cec-allowlist.json`).
 *  Fail-closed: missing/unreadable/malformed file => EMPTY set (every numbered-CEC line blocks). */
function loadAllowlist() {
  const p = join(dirname(fileURLToPath(import.meta.url)), 'iicrc-cec-allowlist.json');
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    const lines = Array.isArray(parsed?.approvedLines) ? parsed.approvedLines : [];
    return new Set(lines.filter((l) => typeof l === 'string' && l.trim()).map(normaliseLine));
  } catch {
    return new Set();
  }
}
const ALLOWLIST = loadAllowlist();

const COPY_EXT = /\.(tsx?|jsx?|mdx?|html?|json)$/;
// Authored, customer-facing surfaces. data/wordpress-export/ is deliberately NOT scanned: it
// is a frozen legacy WooCommerce import snapshot, not authored copy.
//
// The previous version of this note said the export's CEC prose "is already made inert by the
// fail-closed resolver". For CEC that is TRUE, and GP-519's doubt about it was misplaced —
// measured 2026-09-07 through the real path, `getPublishedWpImportRows()` maps every import row
// through `enrichCourseWithCecHours`, and 0 of the 37 rows that reach the seed still carry a
// `cec_hours` value. An earlier revision of this comment claimed 34 unapproved claims were
// being published; that was wrong, counted off the raw export file rather than the code path,
// and a release reviewer caught it.
//
// The note was still incomplete, and dangerously so: it said nothing about `iicrc_discipline`,
// which NOTHING in the import path touches. 5 of those 37 rows carry one (WRT / ASD), and the
// seed wrote it straight into `lms_courses`, which would have reverted migration
// 20260907010000 on those courses. That column is now pinned at the seed.
//
// 27 files reference data/wordpress-export/, so "only one reader" would be wrong. Enumerated
// 2026-09-07 (`git grep -l wordpress-export`), exactly one of them writes these two columns
// INTO lms_courses — the seed above. seed-wordpress-lessons-wxr.ts and
// analyze-module-title-mismatch.ts touch neither column; export-draft-courses-wp-dump.ts runs
// the opposite direction (database -> JSON); wp-export-published-import-slugs.ts only declares
// the row type. That enumeration is what makes the exclusion safe, so re-run it before
// trusting this note.
//
// The exclusion is now sound, for a stated and tested reason rather than an assumed one: that
// seed pins both columns to `null` / `0` regardless of what the export says, and
// scripts/seed-wordpress-export-courses.test.ts asserts it against the real export with a
// mutation control per field. If a second reader of data/wordpress-export/ is ever added, this
// exclusion stops being safe — bring the directory into SCANNED_DIRS then, and do not narrow
// a guard to make it green.
const SCANNED_DIRS = [
  'app/', 'src/', 'templates/',
  'docs/marketing/', 'docs/content/',
  'data/seed/', 'data/voice/',
  'public/courses/',
];
const EXEMPT = [
  'scripts/check-iicrc-compliance.mjs',
  'scripts/check-iicrc-terminology.mjs',
  'CLAUDE.md',
  // Guard / phrase-catalogue infrastructure that legitimately names the banned phrases.
  'src/lib/course-kit/iicrc-phrases.ts',
  'src/lib/course-kit/iicrc-phrases.test.ts',
  'src/lib/course-kit/scaffold.test.ts',
  'src/lib/course-kit/cec-guard.ts',
  'src/lib/seed/cec-hours.ts',
  'src/lib/seed/cec-hours.test.ts',
];

function inScope(f) { const n = f.replace(/\\/g, '/'); return SCANNED_DIRS.some((d) => n.startsWith(d)); }
function isExempt(f) { const n = f.replace(/\\/g, '/'); return EXEMPT.some((e) => n === e || n.endsWith('/' + e)); }

/** Collapse a JavaScript/TypeScript string-concatenation seam (`' + '`, `" + "`) so the ALLOW
 *  window reads as rendered prose rather than as source. Used for the allow test only. */
function collapseConcatSeams(s) { return s.replace(/['"\u2019]\s*\+\s*['"\u2019]/g, ''); }

/** Does the next line CONTINUE the current line's sentence, or start a new block?
 *
 *  The ALLOW window spans the following line because a Prettier wrap lands mid-phrase. A new
 *  markdown/JSX block is not a wrap - it is the next thing. Joining one on anyway appends its
 *  first token to a phrase that already ended, which blocked a real disclaimer:
 *  docs/marketing/lead-magnets/government-contractor-guide.md:308 is a numbered list item
 *  ending "...an IICRC-approved school and examination" with no full stop, and the window
 *  glued the NEXT list item's "3." onto it, so the phrase never terminated.
 *
 *  Refusing to join here narrows the allow window, so it cannot excuse anything the previous
 *  behaviour blocked. */
function continuesPhrase(line) {
  return line.trim() !== '' && !/^\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||`{3})/.test(line);
}

function scanLine(file, lineNo, content, findings, allowlist, nextLine = '') {
  // A specific CEC-hour claim is exempt ONLY when the file belongs to a founder-approved
  // course — i.e. its path contains a slug listed in CEC_APPROVED_SLUGS (empty = none approved).
  const nf = file.replace(/\\/g, '/');
  const cecApproved = CEC_APPROVED_SLUGS.some((slug) => nf.includes(slug));
  for (const rule of [...BANNED, CEC_NUMBER]) {
    if (rule === CEC_NUMBER && cecApproved) continue;
    if (!rule.re.test(content)) continue;
    let flagged;
    if (rule.allowlisted) {
      // CEC_NUMBER: block EVERY numbered-CEC line unless its exact normalised text is human
      // -approved in the allowlist. No regex exemption — the human review is the control.
      flagged = !allowlist.has(normaliseLine(content));
    } else {
      // BANNED rules: line-wide, exempt-if-`allow`.
      //
      // The BAN is tested on this line alone. The ALLOW is tested on this line joined
      // to the next, because Prettier wraps JSX prose and a wrap lands mid-phrase.
      // On 2026-09-10 both `IICRC-approved` findings on main were the legitimate
      // "IICRC-approved / schools" disclaimer split across a line break: the allow
      // pattern below already permits it, but could never match because "school"
      // sat on the following line. The guard therefore fired on the exact sentence
      // CLAUDE.md prescribes ("IICRC certification is obtained only through
      // IICRC-approved schools"), and the cheapest way to green CI would have been
      // deleting a licence-protective disclaimer. Widening the ALLOW window, never
      // the BAN window, keeps the blocked surface identical.
      // Authored prose is also split by JS string concatenation, not only by a Prettier wrap:
      // JsonLd.tsx ships "...an IICRC-approved school and ' +" / "'examination." — one sentence
      // across a `' + '` seam. Collapsing the seam makes the ALLOW window read the prose a user
      // actually sees. This TIGHTENS rather than loosens: without it the closing quote would read
      // as a phrase-ending terminator, so "...school ' + 'training programs" would be excused as
      // a complete noun phrase. The BAN window is untouched — the blocked surface is identical.
      const allowWindow = collapseConcatSeams(
        nextLine && continuesPhrase(nextLine) ? `${content} ${nextLine}` : content
      );
      flagged = !(rule.allow && rule.allow.test(allowWindow));
    }
    if (flagged) {
      findings.push(`  ${file}:${lineNo}: ${rule.message}\n    → ${content.trim().slice(0, 150)}`);
    }
  }
}

/** Scan a single file's full text and return findings (one per offending line).
 *  Exported so the self-test can plant a bad line and assert the guard fires. `allowlist` is the
 *  set of normalised human-approved lines (defaults to the loaded allowlist; the self-test passes
 *  its own set to exercise the allowlisted-line PASS path). */
export function evaluateContent(file, text, allowlist = ALLOWLIST) {
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    scanLine(file, i + 1, lines[i], findings, allowlist, lines[i + 1] ?? '');
  }
  return findings;
}

export { BANNED, CEC_NUMBER, inScope, isExempt, normaliseLine, ALLOWLIST };

function main() {
  let list = '';
  try {
    list = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (err) {
    console.error('check-iicrc-compliance: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const findings = [];
  for (const file of list.split('\n').map((f) => f.trim()).filter((f) => f && COPY_EXT.test(f) && inScope(f) && !isExempt(f))) {
    let text = '';
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    findings.push(...evaluateContent(file, text));
  }

  if (findings.length > 0) {
    console.error(`\n✖ IICRC/CEC compliance guard failed — ${findings.length} issue(s)\n`);
    console.error('CARSI is an IICRC CEC provider, not a certifying body, and a course may only');
    console.error('advertise CEC hours once the founder confirms IICRC approval. Fix these:\n');
    console.error(findings.join('\n'));
    console.error('\nSee CLAUDE.md § "IICRC CEC terminology". A numbered CEC line that is a genuine IICRC program-requirement fact ships ONLY by adding its exact text to scripts/iicrc-cec-allowlist.json after human review; otherwise remove the CEC number (fail-closed).\n');
    process.exit(1);
  }
  console.log('✓ IICRC/CEC compliance guard passed.');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
