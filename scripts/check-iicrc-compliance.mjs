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
  // GAP CLOSED — "IICRC-approved" as a CARSI offering. Legitimate uses (real IICRC schools /
  // exams / the CE-provider program / board-approval process) are allowed.
  { re: /\bIICRC[\s-]*approved\b/i,
    allow: /\bIICRC[\s-]*approved\s+(school|examination|exam|instructor|course\s+of\s+study)|IICRC[\s-]*board[\s-]*approv|(CE|CEC)[\s-]*provider|IICRC[\s-]*approv\w*\s+CE\b/i,
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
// Authored, customer-facing surfaces. NOTE: data/wordpress-export/ is a frozen legacy
// WooCommerce import snapshot (not authored copy) whose CEC prose is already made inert by
// the fail-closed resolver; its legacy-prose cleanup is tracked separately, not gated here.
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

function scanLine(file, lineNo, content, findings, allowlist) {
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
export function evaluateContent(file, text, allowlist = ALLOWLIST) {
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) scanLine(file, i + 1, lines[i], findings, allowlist);
  return findings;
}

export { BANNED, CEC_NUMBER, inScope, isExempt, normaliseLine, ALLOWLIST };

function main() {
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
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
