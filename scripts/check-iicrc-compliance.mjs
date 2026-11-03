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
import { isEntryPoint } from './lib/is-entry-point.mjs';

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
  // GAP CLOSED 2026-11-02 — a course described as "CEC-accredited training / introduction /
  // overview / awareness" (or tagged "(CEC-accredited)") implies the COURSE earns CECs. Only a course
  // in data/seed/cec-approvals.json may say so (CLAUDE.md: CEC is fail-closed, per-course approval).
  // 12 seed entries carried it with no approval and this guard passed them. Denials ("not IICRC CEC
  // accredited") are allowed. CARSI's provider wording ("IICRC CEC Accredited provider/courses") is
  // not matched: the rule only fires on the course-describing nouns below.
  { re: /\bCEC[\s-]+accredited\s+(training|introduction|overview|awareness|programme|program)\b|\(CEC[\s-]+accredited\)/i,
    allow: /\bnot\s+(?:<[^>]+>\s*)?(?:IICRC\s+)?CEC[\s-]+accredited\b|\bIICRC\s+CEC\s+Accredited\s+(training|continuing)/i,
    message: 'A course may be called "CEC-accredited" only once the IICRC has approved it (data/seed/cec-approvals.json). Remove the phrase, or write the denial "not IICRC CEC accredited".' },
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
// Authored, customer-facing surfaces, scanned line by line. data/wordpress-export/ is NOT in this
// list: it is scanned RECORD by RECORD instead (RECORD_SCANNED_DIRS below), because each course's
// description is a single physical JSON line and a line finding cannot name the course slug that
// CEC approval is keyed on.
//
// GP-527 (2026-11-04): this directory used to be excluded outright, on the reasoning that
// `db:seed-wp-export` pins `cec_hours` / `iicrc_discipline` to null regardless of the export.
// That pinning is real and tested (scripts/seed-wordpress-export-courses.test.ts), but it was
// never the whole story: the same seed writes `description` and `short_description` straight
// through into lms_courses (seed-wordpress-export-courses.ts, `description: wp.description`), and
// 30+ of those descriptions carry prose such as "This course is approved for IICRC Continuing
// Education Credit (CEC): 1 Hour". The exclusion therefore reported clean over exactly the
// claims GP-525 is about. Do not narrow the record scan to make the guard green.
const SCANNED_DIRS = [
  'app/', 'src/', 'templates/',
  'docs/marketing/', 'docs/content/',
  'data/seed/', 'data/voice/', 'data/video/', 'data/courses/',
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

// Files whose copy goes to learners of EVERY course, including courses with no IICRC link
// (truckmount, floor care, facilities). Fail-closed: they may carry no IICRC or CEC wording at all,
// not even in comments, because a single shared line would reach a non-IICRC course's learners.
// Added for the public review policy and moderation note (release-gate reviews r3-r4, 18/10/2026).
const IICRC_FREE_FILES = [
  'src/lib/reviews/review-policy.ts',
  'src/components/lms/ReviewPolicy.tsx',
];
const IICRC_FREE_RE = /\bIICRC\b|\bCECs?\b|Continuing Education Credit/i;

/** Findings for an IICRC-free file: one per line that mentions IICRC or CEC. */
export function evaluateIicrcFree(file, text) {
  const findings = [];
  text.split('\n').forEach((line, i) => {
    if (IICRC_FREE_RE.test(line)) {
      findings.push(
        `  ${file}:${i + 1}: this file reaches learners of every course (including non-IICRC ones) and must carry no IICRC/CEC wording\n    → ${line.trim().slice(0, 150)}`
      );
    }
  });
  return findings;
}

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

// ------------------------------------------------------------------------------------------------
// GP-527 — course RECORD scanning (data/wordpress-export/).
//
// Each .json file under RECORD_SCANNED_DIRS must be an array of course records. Every string field
// of every record is HTML-stripped, split into lines and checked against BANNED, CEC_NUMBER and
// CEC_APPROVAL_PROSE. CEC approval is decided by EXACT slug match against the approvals registry
// (never the path-substring test the line scanner uses, which would let "<approved>-copy" through).
// Findings carry { file, slug, field, line, text } so the failure names the course.
export const RECORD_SCANNED_DIRS = ['data/wordpress-export/'];

/** A prose claim that a COURSE carries / is approved for IICRC CECs, numbered or not. Scoped to
 *  course records only: in generic marketing copy "courses approved for IICRC CECs" is a correct
 *  statement about the registry, but inside one course's own description it is a claim about that
 *  course. A denial written immediately before the verb ("not approved for", "does not award") is
 *  not a claim. The last branch catches hours written as words ("(CEC): one Hour"), which the
 *  numeric CEC_NUMBER rule cannot see. */
export const CEC_APPROVAL_PROSE = {
  re: /(?<!\b(?:not|never)\s+(?:yet\s+|been\s+)?)\b(?:approved|accredited|eligible)\s+for\s+(?:the\s+)?(?:IICRC\s+)?(?:CECs?|Continuing[\s-]+Education[\s-]+Credits?)\b|(?<!\b(?:not|never)\s+)\b(?:carry|carries|earn|earns|award|awards|attract|attracts|grant|grants)\s+(?:\d+(?:\.\d+)?\s+)?(?:IICRC\s+)?(?:CECs?|Continuing[\s-]+Education[\s-]+Credits?)\b|\((?:IICRC\s+)?CECs?\)\s*:?\s*(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+(?:an?\s+)?hours?\b/i,
  message:
    'Prose CEC-approval claim in a course record for a slug that is not approved in data/seed/cec-approvals.json. Only the founder can record an approval; until then the claim must not ship (fail-closed, CLAUDE.md).',
};

const ENTITIES = { nbsp: ' ', amp: '&', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', mdash: '-', ndash: '-', quot: '"', apos: "'", lt: '<', gt: '>' };

/** Course-record text as a reader sees it: tags become spaces, common entities decode. A claim
 *  split by markup ("<strong>approved for</strong> IICRC …") must still read as one claim. */
export function recordTextLines(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/ /g, ' ')
    // Invisible characters must not split a word or a phrase (soft hyphen, zero-width, BOM).
    .replace(/[­​-‍⁠﻿]/g, '')
    .split(/\r?\n/)
    .map(normaliseLine)
    .filter(Boolean);
}

/** Every string inside a record, with a dotted field path (meta.pricing, tags.0, …). */
function stringFields(value, path, out) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => stringFields(v, `${path}.${i}`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) stringFields(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

/** Scan one record file. Fail-closed: unparsable JSON, a non-array, or a non-object entry is a
 *  finding (never "no records"); a record without a string slug can never be approved. */
export function evaluateRecords(file, jsonText, { approvedSlugs, allowlist = ALLOWLIST } = {}) {
  const approved = approvedSlugs ?? new Set(CEC_APPROVED_SLUGS);
  const findings = [];
  const structural = (message) =>
    findings.push({ file, slug: null, field: null, line: 0, text: '', message, structural: true });
  let rows;
  try {
    rows = JSON.parse(jsonText);
  } catch (err) {
    structural(`could not be parsed as JSON (${err.message}); a record file the guard cannot read is a failure, never a pass`);
    return findings;
  }
  if (!Array.isArray(rows)) {
    structural('is not an array of course records; the record scan cannot check it');
    return findings;
  }
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      structural(`entry ${i} is not a course record object`);
      return;
    }
    const slug = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : `<record ${i} has no slug>`;
    const isApproved = approved.has(slug);
    const rules = [...BANNED, CEC_NUMBER, CEC_APPROVAL_PROSE].filter(
      (rule) => !(isApproved && (rule === CEC_NUMBER || rule === CEC_APPROVAL_PROSE))
    );
    const flags = (rule, text) =>
      rule.re.test(text) && (rule.allowlisted ? !allowlist.has(text) : !(rule.allow && rule.allow.test(text)));
    for (const [field, value] of stringFields(row, '', [])) {
      if (field === 'slug') continue;
      const lines = recordTextLines(value);
      const hitRules = new Set();
      lines.forEach((text, li) => {
        for (const rule of rules) {
          if (!flags(rule, text)) continue;
          hitRules.add(rule);
          findings.push({ file, slug, field, line: li + 1, text, message: rule.message });
        }
      });
      // Review r1 (Codex, P1): a claim split across lines ("approved for\nIICRC Continuing
      // Education Credits.") matched no single line. Check the whole field as one text too; a rule
      // that fires only there is reported once for the field (line 0, the joined text).
      const joined = lines.join(' ');
      for (const rule of rules) {
        if (hitRules.has(rule) || !flags(rule, joined)) continue;
        findings.push({ file, slug, field, line: 0, text: joined, message: `${rule.message} (claim spans several lines)` });
      }
    }
  });
  return findings;
}

const exposureKey = (e) => [e.file, e.slug, e.field, normaliseLine(String(e.text ?? ''))].join('\u0000');

/** Split record findings into BLOCKING and KNOWN EXPOSURE (GP-525).
 *
 *  The known-exposure list is NOT an approval. It pins, by exact (file, slug, field, text), the
 *  unbacked claims that already exist in the frozen WordPress export and whose resolution is
 *  founder-reserved under GP-525 (record the approval, or strip the claim). They are printed on
 *  every run. Anything else blocks: a new slug, a changed claim (e.g. the hours edited), the same
 *  text in another field, a stale entry whose claim is gone (so the list only shrinks), and a slug
 *  that is both on this list and approved in the registry (the entry must then be removed). */
export function classifyRecordFindings(findings, exposureEntries, approvedSlugs) {
  const approved = approvedSlugs ?? new Set(CEC_APPROVED_SLUGS);
  const listed = new Map(exposureEntries.map((e) => [exposureKey(e), e]));
  const matched = new Set();
  const blocking = [];
  const known = [];
  for (const f of findings) {
    const key = exposureKey(f);
    if (!f.structural && listed.has(key)) {
      matched.add(key);
      known.push(f);
    } else {
      blocking.push(f);
    }
  }
  for (const [key, e] of listed) {
    if (approved.has(e.slug)) {
      blocking.push({ ...e, line: 0, message: `slug "${e.slug}" is approved in data/seed/cec-approvals.json but still on the GP-525 known-exposure list; remove the entry from ${KNOWN_EXPOSURE_FILE}` });
    } else if (!matched.has(key)) {
      blocking.push({ ...e, line: 0, message: `stale GP-525 known-exposure entry: this claim is no longer present; remove the entry from ${KNOWN_EXPOSURE_FILE}` });
    }
  }
  return { blocking, known };
}

/** GP-525 known-exposure list. Read from the SCANNED tree (cwd), so a scratch repo without the
 *  file gets an empty list — stricter, never looser. Fail-closed: a missing, unreadable or
 *  malformed file is an EMPTY list, so every export claim blocks. */
export const KNOWN_EXPOSURE_FILE = 'scripts/iicrc-cec-known-exposure.json';
function loadKnownExposure() {
  try {
    const parsed = JSON.parse(readFileSync(KNOWN_EXPOSURE_FILE, 'utf8'));
    if (parsed?.issue !== 'GP-525' || !Array.isArray(parsed?.entries)) return [];
    return parsed.entries.filter(
      (e) => e && ['file', 'slug', 'field', 'text'].every((k) => typeof e[k] === 'string' && e[k])
    );
  } catch {
    return [];
  }
}

function formatRecordFinding(f) {
  const where = f.slug ? `${f.file} [slug: ${f.slug}] ${f.field}${f.line ? ` line ${f.line}` : ''}` : f.file;
  return `  ${where}: ${f.message}${f.text ? `\n    → ${f.text.slice(0, 150)}` : ''}`;
}

function inRecordScope(f) { const n = f.replace(/\\/g, '/'); return n.endsWith('.json') && RECORD_SCANNED_DIRS.some((d) => n.startsWith(d)); }

export { BANNED, CEC_NUMBER, CEC_APPROVED_SLUGS, inScope, isExempt, normaliseLine, ALLOWLIST, IICRC_FREE_FILES };

function main() {
  let list = '';
  try {
    list = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (err) {
    console.error('check-iicrc-compliance: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const findings = [];
  const files = list.split('\n').map((f) => f.trim()).filter(Boolean);
  for (const file of files.filter((f) => COPY_EXT.test(f) && inScope(f) && !isExempt(f))) {
    let text = '';
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    findings.push(...evaluateContent(file, text));
  }

  // GP-527: course records, slug-aware. A listed record file that cannot be read is a failure.
  const recordFindings = [];
  for (const file of files.filter(inRecordScope)) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      recordFindings.push({ file, slug: null, field: null, line: 0, text: '', structural: true, message: `could not be read (${err.message})` });
      continue;
    }
    recordFindings.push(...evaluateRecords(file, text));
  }
  const { blocking, known } = classifyRecordFindings(recordFindings, loadKnownExposure());
  findings.push(...blocking.map(formatRecordFinding));
  if (known.length > 0) {
    const slugs = [...new Set(known.map((f) => f.slug))];
    const lines = [...new Map(known.map((f) => [exposureKey(f), f])).values()];
    console.error(
      `\n⚠ KNOWN EXPOSURE — NOT APPROVED (GP-525): ${lines.length} unbacked CEC claim line(s) in ${slugs.length} course record(s) ` +
      `are pinned in ${KNOWN_EXPOSURE_FILE} pending the founder's decision (record the IICRC approval, or strip the claim). ` +
      `They are not approvals; any new or changed claim fails this guard.`
    );
    console.error(lines.map((f) => `  ${f.file} [slug: ${f.slug}] ${f.field} line ${f.line} → ${f.text.slice(0, 110)}`).join('\n'));
  }
  for (const file of IICRC_FREE_FILES) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      // Scope floor: a listed file that vanished is a failure, never a silent pass.
      findings.push(`  ${file}: listed as IICRC-free but could not be read — update IICRC_FREE_FILES deliberately`);
      continue;
    }
    findings.push(...evaluateIicrcFree(file, text));
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

if (isEntryPoint(import.meta.url)) main();
