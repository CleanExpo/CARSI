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
  // BLOCK-BY-DEFAULT + EXPLICIT HUMAN ALLOWLIST. Terminal design decision (v4, 2026-09-10),
  // reached the same way CEC_NUMBER below reached it, and for the same reason.
  //
  // Four successive regex allow-patterns were each defeated by a new prose construction:
  //   v1  institution noun, minus "courses"      -> beaten by "school training"
  //   v2  institution noun must END its phrase   -> beaten by "school's examination courses"
  //   v3  the whole institution CHAIN must end   -> beaten by "school, courses" and "school & courses"
  //   and probing v3 found ";", ":", "-", "—" leaking identically, plus three allow branches
  //   that were bare prefix matchers ignoring everything after them.
  // Every round was ONE defect - an unjudged span after an anchor - at a new position. Deciding
  // whether a noun is the head of a phrase or a modifier of a CARSI product is a question about
  // free prose, and a regex over free prose is the wrong control for a licence-critical gate.
  //
  // So: EVERY line containing "IICRC-approved" is a finding, UNLESS the line's exact normalised
  // text appears in `scripts/iicrc-cec-allowlist.json` (`iicrcApprovedLines`). Exact string match
  // only - no pattern, no fuzzy, no wildcard - so a near-miss variant still blocks and no prose
  // construction can smuggle a claim through. The human review IS the control. The tree's 60
  // occurrences reduce to 27 distinct lines, listed there and read one by one.
  //
  // Fail-closed: an empty or unreadable allowlist blocks every one of them.
  { re: /\bIICRC[\s-]*approved\b/i,
    allowlisted: 'iicrcApprovedLines',

    // The approved unit is the smallest window of 1..N lines STARTING at the flagged line
    // that ends at a sentence terminator (see isCompleteStatement). Prose wraps; a claim does
    // not stop being one claim because Prettier broke it across six lines.
    allowlistMaxWindow: 6,
    message: 'Bare "IICRC-approved" implies IICRC approves CARSI\'s courses/certifications — say "IICRC CEC Accredited". Every line naming it is blocked by default; a legitimate line ships ONLY by adding its exact text to scripts/iicrc-cec-allowlist.json (iicrcApprovedLines) after human review.' },
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
  // Names WHICH allowlist: a line approved as a genuine CEC-hour fact must not also excuse an
  // "IICRC-approved" claim, so the two rules never share a set.
  allowlisted: 'approvedLines',
  message: 'Specific IICRC CEC-hour claim on a non-approved course. Every numbered "N IICRC CEC(s)" claim is blocked by default; it ships ONLY if a human adds the line\'s exact text to scripts/iicrc-cec-allowlist.json (approvedLines) after review, or the file sits under a founder-approved course slug (data/seed/cec-approvals.json). No pattern/auto-exemption — a near-miss still blocks. If this is a genuine IICRC program-requirement fact, add the exact line to the allowlist; if it is a course-award claim, remove the CEC number (fail-closed, CLAUDE.md).',
};

/** Normalise a line for exact allowlist comparison: trim ends, collapse internal whitespace runs.
 *  Deliberately conservative — case and wording are preserved, so a near-miss variant does NOT
 *  match an allowlisted line (no accidental wildcarding). */
function normaliseLine(s) { return s.replace(/\s+/g, ' ').trim(); }

/** Load the human-maintained exact-line allowlists (`scripts/iicrc-cec-allowlist.json`).
 *  `approvedLines` gates CEC_NUMBER; `iicrcApprovedLines` gates the "IICRC-approved" rule.
 *  Two sets, never one: a line approved as a genuine CEC-hour fact must not also excuse an
 *  "IICRC-approved" claim.
 *  Fail-closed: missing/unreadable/malformed file => EMPTY sets (every such line blocks). */
function loadAllowlists() {
  const p = join(dirname(fileURLToPath(import.meta.url)), 'iicrc-cec-allowlist.json');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { approvedLines: new Set(), iicrcApprovedLines: new Set() };
  }
  const toSet = (v) =>
    new Set((Array.isArray(v) ? v : []).filter((l) => typeof l === 'string' && l.trim()).map(normaliseLine));
  return {
    approvedLines: toSet(parsed?.approvedLines),
    iicrcApprovedLines: refuseIncompleteEntries(toSet(parsed?.iicrcApprovedLines)),
  };
}

/** Is this text a COMPLETE statement - one that cannot be continued by whatever follows it?
 *
 *  An entry that stops mid-sentence is a wildcard, not an approval: it says nothing about the
 *  rest of its own sentence, so approving it permits every possible continuation. Round 5 of
 *  review proved that with a real one, and 12 of the 27 entries had the same shape.
 *
 *  `:` and `,` are deliberately NOT terminators - `:` introduces a list ("IICRC-approved
 *  schools: courses, exams") and `,` coordinates one, and both leaked in round 4. A comma is
 *  allowed only in the CLOSER set, where it is structural (a JSON line ends `.",`) and can
 *  only ever follow a real terminator.
 *
 *  A markdown table row or list item is complete by structure: the newline ends it.
 *
 *  This test runs on entries the founder wrote, not on prose an attacker controls, so its
 *  failure direction is the safe one: a terminator this does not know about means the entry is
 *  REFUSED and CI goes red, never that a claim slips through. That is what separates it from
 *  the four allow-patterns it replaces. */
function isCompleteStatement(text, sourceLine = '') {
  if (/[.!?;][)\]}{'"\u2019\u201d,\s]*$/.test(text)) return true;
  return /^\s*(?:\|.*\||[-*+]\s|\d+[.)]\s)/.test(sourceLine);
}

/** Drop entries that are not complete statements. */
function refuseIncompleteEntries(set) {
  return new Set([...set].filter((line) => isCompleteStatement(line, line)));
}

const ALLOWLISTS = loadAllowlists();

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

function scanLine(file, lineNo, content, findings, allowlist, followingLines = []) {
  // A specific CEC-hour claim is exempt ONLY when the file belongs to a founder-approved
  // course — i.e. its path contains a slug listed in CEC_APPROVED_SLUGS (empty = none approved).
  const nf = file.replace(/\\/g, '/');
  const cecApproved = CEC_APPROVED_SLUGS.some((slug) => nf.includes(slug));
  for (const rule of [...BANNED, CEC_NUMBER]) {
    if (rule === CEC_NUMBER && cecApproved) continue;
    if (!rule.re.test(content)) continue;
    let flagged;
    if (rule.allowlisted) {
      // Block EVERY matching line unless its exact normalised text is human-approved in that
      // rule's allowlist. No regex exemption — the human review is the control.
      const approved = allowlist[rule.allowlisted] ?? new Set();
      // Try progressively longer windows starting at this line. Approving a LINE is not enough
      // when the line's sentence continues: round 5 of review kept an approved first line and
      // changed only its wrapped continuation to a CARSI-offering claim, and the scan stayed
      // green. So the unit that gets approved must be a COMPLETE statement, and any edit
      // anywhere inside it changes the text and stops it matching.
      const window = rule.allowlistMaxWindow ?? 1;
      flagged = true;
      for (let k = 0; k < window && flagged; k++) {
        const text = normaliseLine([content, ...followingLines.slice(0, k)].join(' '));
        // Completeness is enforced HERE, not only when the file is loaded, so the property
        // holds however the set was built. An entry that stops mid-sentence never matches.
        if (approved.has(text) && isCompleteStatement(text, content)) flagged = false;
      }
    } else {
      // Regex-allow rules are unchanged and still test the line as a whole.
      flagged = !(rule.allow && rule.allow.test(content));
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
export function evaluateContent(file, text, allowlist = ALLOWLISTS) {
  // Back-compat: a bare Set means "this is everything that is approved", so it applies to every
  // allowlisted rule. Passing `new Set()` therefore still means "nothing is approved anywhere".
  const sets =
    allowlist instanceof Set
      ? { approvedLines: allowlist, iicrcApprovedLines: allowlist }
      : allowlist;
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    scanLine(file, i + 1, lines[i], findings, sets, lines.slice(i + 1, i + 6));
  }
  return findings;
}

export { BANNED, CEC_NUMBER, inScope, isExempt, normaliseLine, ALLOWLISTS };

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
