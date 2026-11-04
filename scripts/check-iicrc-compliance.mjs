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
import { createHash } from 'node:crypto';
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
    allow: /\bIICRC[\s-]+CEC[\s-]+Accredited\b/i,
    message: 'Say "IICRC CEC Accredited", never bare "IICRC Accredited".',
  },
  {
    re: /\bIICRC[\s-]*accredited[\s-]+courses?\b/i,
    allow: null,
    message:
      'Not "IICRC-accredited course(s)" — say "IICRC CEC Accredited course(s)" (even in a negated disclaimer, write "not IICRC CEC accredited").',
  },
  {
    re: /\bIICRC[\s-]+courses?[\s-]+accredit\w*\b/i,
    allow: null,
    message:
      'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".',
  },
  // GAP CLOSED — "IICRC-approved" as a CARSI offering. Legitimate uses (real IICRC schools /
  // exams / the CE-provider program / board-approval process) are allowed.
  {
    re: /\bIICRC[\s-]*approved\b/i,
    allow:
      /\bIICRC[\s-]*approved\s+(school|examination|exam|instructor|course\s+of\s+study)|IICRC[\s-]*board[\s-]*approv|(CE|CEC)[\s-]*provider|IICRC[\s-]*approv\w*\s+CE\b/i,
    message:
      'Bare "IICRC-approved" implies IICRC approves CARSI\'s courses/certifications — say "IICRC CEC Accredited".',
  },
  // GAP CLOSED — "get / certified ... with CARSI" without IICRC adjacency.
  {
    re: /\b(get|gain|become|be)\s+certified\b[^.\n]{0,24}\bwith\s+CARSI\b/i,
    allow: null,
    message:
      'CARSI delivers IICRC CEC training, not certification — do not say "get certified with CARSI".',
  },
  {
    re: /\bcertified\s+online\s+with\s+CARSI\b/i,
    allow: null,
    message:
      'CARSI delivers IICRC CEC training, not certification — reframe "certified online with CARSI".',
  },
  // GAP CLOSED 2026-11-02 — a course described as "CEC-accredited training / introduction /
  // overview / awareness" (or tagged "(CEC-accredited)") implies the COURSE earns CECs. Only a course
  // in data/seed/cec-approvals.json may say so (CLAUDE.md: CEC is fail-closed, per-course approval).
  // 12 seed entries carried it with no approval and this guard passed them. Denials ("not IICRC CEC
  // accredited") are allowed. CARSI's provider wording ("IICRC CEC Accredited provider/courses") is
  // not matched: the rule only fires on the course-describing nouns below.
  {
    re: /\bCEC[\s-]+accredited\s+(training|introduction|overview|awareness|programme|program)\b|\(CEC[\s-]+accredited\)/i,
    allow:
      /\bnot\s+(?:<[^>]+>\s*)?(?:IICRC\s+)?CEC[\s-]+accredited\b|\bIICRC\s+CEC\s+Accredited\s+(training|continuing)/i,
    message:
      'A course may be called "CEC-accredited" only once the IICRC has approved it (data/seed/cec-approvals.json). Remove the phrase, or write the denial "not IICRC CEC accredited".',
  },
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
  message:
    'Specific IICRC CEC-hour claim on a non-approved course. Every numbered "N IICRC CEC(s)" claim is blocked by default; it ships ONLY if a human adds the line\'s exact text to scripts/iicrc-cec-allowlist.json (approvedLines) after review, or the file sits under a founder-approved course slug (data/seed/cec-approvals.json). No pattern/auto-exemption — a near-miss still blocks. If this is a genuine IICRC program-requirement fact, add the exact line to the allowlist; if it is a course-award claim, remove the CEC number (fail-closed, CLAUDE.md).',
};

/** Normalise a line for exact allowlist comparison: trim ends, collapse internal whitespace runs.
 *  Deliberately conservative — case and wording are preserved, so a near-miss variant does NOT
 *  match an allowlisted line (no accidental wildcarding). */
function normaliseLine(s) {
  return s.replace(/\s+/g, ' ').trim();
}

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
  'app/',
  'src/',
  'templates/',
  'docs/marketing/',
  'docs/content/',
  'data/seed/',
  'data/voice/',
  'data/video/',
  'data/courses/',
  'public/courses/',
];
const EXEMPT = [
  'scripts/check-iicrc-compliance.mjs',
  'scripts/check-iicrc-terminology.mjs',
  'docs/agents/CLAUDE.md',
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

function inScope(f) {
  const n = f.replace(/\\/g, '/');
  return SCANNED_DIRS.some((d) => n.startsWith(d));
}
function isExempt(f) {
  const n = f.replace(/\\/g, '/');
  return EXEMPT.some((e) => n === e || n.endsWith('/' + e));
}

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
// of every record is HTML-stripped, split into lines (and also checked whole, so a claim cannot hide
// across lines) against BANNED, CEC_NUMBER and CEC_APPROVAL_PROSE. CEC approval is decided by EXACT slug match against the approvals registry
// (never the path-substring test the line scanner uses, which would let "<approved>-copy" through).
// Findings carry { file, slug, field, line, text } so the failure names the course.
export const RECORD_SCANNED_DIRS = ['data/wordpress-export/'];

/** Any CEC / continuing-education wording in a course record whose slug is not approved.
 *
 *  BLOCK-BY-DEFAULT, deliberately not a phrase list. The first version of this rule enumerated
 *  claim shapes ("approved for …", "carries …", "(CEC): N Hours") and independent review defeated
 *  it twice with ordinary wording (a claim split across lines; "IICRC CEC approved"). That is the
 *  same lesson recorded on CEC_NUMBER above: a regex over free prose cannot tell a claim from a
 *  non-claim. Inside ONE course's own record there is no need to: CLAUDE.md allows CEC wording on a
 *  course only once that course is approved, so for an unapproved slug every mention is a finding —
 *  claims, headings ("CEC Credits"), "approved by the IICRC", and denials alike. The remedy is to
 *  remove the wording or record the approval; there is no exemption by wording.
 *
 *  Scoped to course records only. In generic marketing copy "courses the IICRC has approved for
 *  CECs" is a correct statement about the registry and is handled by the line rules. */
export const CEC_APPROVAL_PROSE = {
  // GP-673: letters spaced or punctuated apart ("C E C", "C-E-C", "C.E.C."), and "CEC" glued to a
  // word at either end ("CECapproved", "approvedCECs"), read as CEC to a learner too.
  re: /\bCECs?\b|\bC[\s.\-_*/]*E[\s.\-_*/]*Cs?\b|\bCECs?(?=[a-z])|(?<=[a-z])CECs?\b|continuing[\s-]*education|\bapprov\w*\s+by\s+(?:the\s+)?IICRC\b|\bIICRC[\s-]*(?:CEC[\s-]*)?(?:approv|accredit|certif)\w*/i,
  message:
    'CEC / continuing-education wording in the record of a course that is not approved in data/seed/cec-approvals.json. On an unapproved course any such wording is blocked (claims, headings and denials alike); remove it, or the founder records the IICRC approval (fail-closed, CLAUDE.md).',
};

/** GP-673: upper-case "CEC" inside a longer word ("IICRCCECapproved"). Case-sensitive on purpose:
 *  lower-case "cec" inside words is ordinary spelling ("Recece"), upper-case is the acronym. */
export const CEC_INSIDE_WORD = { re: /CEC/, message: CEC_APPROVAL_PROSE.message };

const ENTITIES = { nbsp: ' ', amp: '&', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', mdash: '-', ndash: '-', quot: '"', apos: "'", lt: '<', gt: '>' };

/** A numeric character reference as a browser decodes it. GP-673: browsers decode "&#67EC" (no
 *  semicolon) as "CEC", so the semicolon is optional. An out-of-range number becomes U+FFFD, as in
 *  a browser, instead of crashing the guard. */
function codePoint(n) {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '\uFFFD';
}
function decodeNumericRefs(s) {
  return s
    .replace(/&#(\d+);?/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => codePoint(parseInt(h, 16)));
}

/** Course-record text as a reader sees it: tags become spaces, common entities decode. A claim
 *  split by markup ("<strong>approved for</strong> IICRC …") must still read as one claim. */
export function recordTextLines(value) {
  return decodeNumericRefs(value.replace(/<[^>]*>/g, ' '))
    .replace(/&([a-z]+);/gi, (m, name) => (Object.hasOwn(ENTITIES, name.toLowerCase()) ? ENTITIES[name.toLowerCase()] : m))
    .replace(/ /g, ' ')
    // Invisible characters must not split a word or a phrase (soft hyphen, zero-width, BOM).
    .replace(/[­​-‍⁠﻿]/g, '')
    .split(/\r?\n/)
    .map(normaliseLine)
    .filter(Boolean);
}

/** Tags a browser renders as a break between words. Every other tag is inline: it adds no space. */
const BLOCK_TAG_RE = /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|img|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi;

/** The field's text as a browser shows it: block tags separate words, inline tags join with no
 *  space. Review r3 (Codex, P1): "IICRC <span>C</span><span>E</span><span>C</span> approved"
 *  renders as "IICRC CEC approved", but the tag-to-space step above read it as "C E C".
 *  Text a browser draws from CSS or an image is not text in the record and is not seen here; for
 *  unapproved courses the GP-673 readability gate below fails such constructs closed instead. */
function renderedRecordText(value) {
  return recordTextLines(value.replace(BLOCK_TAG_RE, ' ').replace(/<[^>]*>/g, '')).join(' ');
}

/** The same text with markup delimiters turned to spaces instead of whole tags removed, so text
 *  inside attributes that still renders (alt, title, aria-label) is checked too. */
function rawRecordText(value) {
  // GP-673: percent-escapes too ("gp-%63ec-course" is shown as "gp-cec-course" in the address bar).
  const unescaped = value.replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return recordTextLines(unescaped.replace(/[<>"'=/]/g, ' ')).join(' ');
}

/** Every string inside a record, with a dotted field path (meta.pricing, tags.0, …). Positive
 *  numbers under a CEC-named key (cec_hours, meta.cec, …) are included as "key: N" text: that is a
 *  CEC-hours claim in its plainest form. */
function stringFields(value, path, out, underCec = false) {
  // Review r4 (Codex, P1): the CEC context is the whole key path, not the last key, and the value
  // may be a numeric string or sit in a list ("cec_hours": "5", "meta.cec_hours": [5], cec.hours).
  // Review r5 (Codex, P1): the string may carry ordinary unit wording ("1 Hour", "1.5 hours"), so
  // under a CEC key any positive number in the string is the hours claim, not only a bare number.
  const cec = underCec || /cec/i.test(path.split('.').pop() ?? '');
  const hours =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Math.max(0, ...(value.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))
        : NaN;
  if (cec && hours > 0) out.push([path, `${path}: ${hours} CEC hours`]);
  else if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => stringFields(v, `${path}.${i}`, out, cec));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) stringFields(v, path ? `${path}.${k}` : k, out, cec);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// GP-673 — READABILITY GATE for course records.
//
// THREAT MODEL. A deliberate adversary edits data/wordpress-export/ so that a learner SEES CEC
// wording on a course the IICRC has not approved, while this text scanner reads something harmless.
// GP-527's four review rounds each found a new disguise (a claim split across lines, reordered
// wording, tags inside a word, hours stored as a string or in the slug); the P1 counts did not
// converge, so another regex patch is the wrong control. Known disguises of that kind: text drawn by
// CSS (::before content, web fonts), text reordered by CSS or bidi controls, decoy letters hidden by
// CSS or markup inside a word, text inside images or SVG, look-alike characters, encodings the
// scanner did not decode, and record fields the scanner does not know.
//
// CONTROL. The export is frozen (WordPress, April 2026). For a course NOT approved in
// data/seed/cec-approvals.json, every field must use only the markup, CSS declarations, characters
// and record shape already reviewed in that export (the lists below). Anything else is a finding:
// "the checker cannot read this the way a browser shows it". The lists are exact values, never
// patterns, and are never derived from the export at run time, so an edit cannot approve itself.
// A new construct ships only by a human adding it here, in a reviewed change.
//
// RESIDUAL (stated, not hidden): wording drawn into the pixels of the ONE reviewed image (its source
// returned 404 on 04/11/2026, so it shows nothing today); ASCII look-alikes such as "C3C" or "(EC";
// lower-case "cec" in the middle of a word; and any surface outside data/wordpress-export/ (authored
// source under app/ and src/ is covered by the line rules and code review, not by this gate).
// Approved courses are not held to the gate: they may state CEC wording openly.

/** Record fields and the value types the reviewed export uses. "hours" is a CEC-hours string such
 *  as "", "0" or "1.5 Hours" (the hours rule above still reads it); "string[]" and "category[]" are
 *  arrays of those shapes. Any other key, or a known key holding another type, is a finding. */
const RECORD_SHAPE = {
  slug: ['string'], title: ['string'], description: ['string'], short_description: ['string'],
  thumbnail_url: ['string'], status: ['string'], price_aud: ['number'], is_free: ['boolean'],
  duration_hours: ['number', 'null'], level: ['string', 'null'], category: ['string'],
  tags: ['string[]'], iicrc_discipline: ['string', 'null'], cec_hours: ['number', 'null', 'hours'],
  cppp40421_unit_code: ['string', 'null'], cppp40421_unit_name: ['string', 'null'],
  meta: ['object'], wp_id: ['number'], wp_permalink: ['string'],
  'meta.wp_id': ['number'], 'meta.wp_categories': ['category[]'], 'meta.wp_tags': ['string[]'],
  'meta.original_price': ['string', 'number', 'null'], 'meta.sale_price': ['string', 'number', 'null'],
};
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const SHAPE_TEST = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  null: (v) => v === null,
  object: isPlainObject,
  hours: (v) => typeof v === 'string' && /^\s*(?:\d+(?:\.\d+)?\s*(?:hours?)?)?\s*$/i.test(v),
  'string[]': (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  'category[]': (v) =>
    Array.isArray(v) &&
    v.every((c) => isPlainObject(c) && Object.keys(c).sort().join() === 'id,name,slug' &&
      typeof c.id === 'number' && typeof c.name === 'string' && typeof c.slug === 'string'),
};

/** Fields of a record that are outside the reviewed shape: [field, problem]. */
export function recordShapeProblems(row) {
  const out = [];
  const typeName = (v) => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v);
  const check = (path, v) => {
    const allowed = Object.hasOwn(RECORD_SHAPE, path) ? RECORD_SHAPE[path] : undefined;
    if (!allowed) out.push([path, `field "${path}" is not in the reviewed record shape`]);
    else if (!allowed.some((t) => SHAPE_TEST[t](v))) out.push([path, `field "${path}" holds a ${typeName(v)} value the reviewed record shape does not allow`]);
  };
  for (const [k, v] of Object.entries(row)) {
    check(k, v);
    if (k === 'meta' && isPlainObject(v)) for (const [mk, mv] of Object.entries(v)) check(`meta.${mk}`, mv);
  }
  return out;
}

/** Elements and attributes the reviewed export uses. <img> is accepted only as an exact reviewed
 *  tag (REVIEWED_IMAGES); <style> only as an exact reviewed block (REVIEWED_STYLE_BLOCKS). */
const READABLE_TAGS = new Set(['p', 'a', 'br', 'ul', 'li', 'strong', 'em', 'h1', 'h2', 'h3', 'h4']);
const READABLE_ATTRS = { p: ['style'], li: ['style'], ul: ['style', 'type'], strong: ['style'], a: ['href', 'role'] };
const READABLE_ATTR_VALUES = { 'ul.type': ['disc'], 'a.role': ['button'] };
/** Every inline CSS declaration in the reviewed export, per element, normalised (lower case, no
 *  spaces around ":"). Anything else (display, order, direction:rtl, content, font-size:0, negative
 *  margins, other colours, url(), escapes, comments) could hide, reorder or draw text: a finding.
 *  Per element on purpose: colour, background and the relative (em) sizes are accepted only on <p>,
 *  a block, which cannot sit inside a word and cannot nest in another <p>, so it can neither hide a
 *  decoy letter inside a word nor shrink text by compounding. The one inline element, <strong>,
 *  may only set a fixed 16px. */
const READABLE_CSS = new Map([
  ['p', new Set([
    'margin:0in', 'margin-left:.375in', 'padding:10px 14px', 'font-family:calibri',
    'font-size:0.85em', 'font-size:0.95em', 'font-size:11.0pt', 'font-size:13.5pt',
    // One callout box: grey text on a pale yellow background with a border.
    'color:#555', 'background:#fff8e1', 'border:1px solid #b58900', 'border-radius:6px',
  ])],
  ['li', new Set(['margin-top:0', 'margin-bottom:0', 'vertical-align:middle', 'list-style-type:none'])],
  // Left-to-right only; "embed" with ltr does not reorder left-to-right text.
  ['ul', new Set(['direction:ltr', 'unicode-bidi:embed', 'margin-top:0in', 'margin-bottom:0in'])],
  ['strong', new Set(['font-size:16px'])],
]);
/** The one <style> block in the export (Elementor heading sizes), compared after comments and stray
 *  <br /> are removed and whitespace is normalised. It sets only padding, margin, line-height,
 *  colour:inherit and font sizes 15-59px on heading classes. */
const REVIEWED_STYLE_BLOCKS = new Set([
  '.elementor-heading-title{padding:0;margin:0;line-height:1}.elementor-widget-heading .elementor-heading-title[class*=elementor-size-]>a{color:inherit;font-size:inherit;line-height:inherit}.elementor-widget-heading .elementor-heading-title.elementor-size-small{font-size:15px}.elementor-widget-heading .elementor-heading-title.elementor-size-medium{font-size:19px}.elementor-widget-heading .elementor-heading-title.elementor-size-large{font-size:29px}.elementor-widget-heading .elementor-heading-title.elementor-size-xl{font-size:39px}.elementor-widget-heading .elementor-heading-title.elementor-size-xxl{font-size:59px}',
]);
/** Images reviewed by a person, per course, compared by SHA-256 of the exact tag text (so a changed
 *  src, srcset or alt is a new, unreviewed image). Text inside an image cannot be read by this
 *  checker; each entry says why the image is acceptable. */
const REVIEWED_IMAGES = [
  {
    slug: 'large-loss-mastery-super-course',
    src: 'https://carsi.com.au/wp-content/uploads/2022/06/Things-to-Do-in-Sydney-3-1024x512.png',
    sha256: 'b3f9a62392fc11950cf92f61a477a59b8ef982748b9a5eee859b44405063fc21',
    reason:
      'Venue picture for the in-person course (alt "Novotel Accommodation", file "Things-to-Do-in-Sydney-3"). On 04/11/2026 the ' +
      'GP-673 job fetched this src and the i0.wp.com copy: both returned HTTP 404, so no image pixels reach a learner; a broken ' +
      'image shows only its alt text, which the record scan reads. Any change to the tag is a new, unreviewed image.',
  },
];
/** Course-card thumbnails (thumbnail_url, which the seed copies to lms_courses.thumbnailUrl) for
 *  unapproved courses, pinned per course exactly as in the frozen export, under THUMBNAIL_BASE.
 *  These were pinned, not opened one by one: the pin stops a NEW or swapped image (for example a
 *  "CEC approved" badge) arriving unseen. Whether an existing thumbnail already shows CEC wording
 *  is GP-525 content, not something this text checker can decide. "" (no image) is accepted. */
const THUMBNAIL_BASE = 'https://carsi.com.au/wp-content/uploads/';
const REVIEWED_THUMBNAILS = new Map([
  ["adjusters", "2024/08/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png"],
  ["admin-sole-trader", "2021/06/admin.png"],
  ["advanced-applied", "2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png"],
  ["advancedstructural", "2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png"],
  ["affiliate-membership", "2021/04/HISTORY-2021-04-06T153308.009.png"],
  ["agi-smallbusiness", "2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["air-quality-and-odour", "2025/07/air-quality-and-odour.png"],
  ["antiques", "2024/11/ANTIQUES-COURSE.png"],
  ["applied-microbial", "2024/04/Copy-of-Copy-of-drying-techniques-1.png"],
  ["asbestos", "2024/08/Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png"],
  ["asthmaallergy", "2021/02/ASTHMA-AND-ALLERGY.png"],
  ["biologicalcontaminants", "2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-2.png"],
  ["carpet-cleaning", "2023/12/basic-carpet-cleaning.png"],
  ["carpet-cleaning-basics", "2021/02/CARPET-CLEANING-2.png"],
  ["carsi-chatgpt-ebook", "2023/05/GPT-BOOK.png"],
  ["chat-gpt", "2023/09/chat-gpt.png"],
  ["collaborative-development-your-personal-ai-assistant", "2024/10/Copy-of-Add-a-heading.png"],
  ["complex-water-losses", "2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png"],
  ["controlled-drying", "2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png"],
  ["dehumidifiers", "2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-6.png"],
  ["difficult-materials", "2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1-1.png"],
  ["donning-and-doffing-ppe", "2021/03/DONNING-AND-DOFFING-1-1.png"],
  ["drying-healthcare", "2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png"],
  ["drying-techniques", "2023/12/drying-techniques-2.png"],
  ["drying-transportation", "2024/11/Copy-of-Copy-of-Copy-of-Copy-of-Live-AI-course-graphic-idea-3.png"],
  ["dryingprotocol", "2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png"],
  ["duct-cleaning", "2023/12/DUCT-CLEANING.png"],
  ["dust-particulates-in-indoor-air", "2025/07/DUST-AND-PARTICULATES.png"],
  ["educational", "2024/10/EDUCATIONAL-SITES-COURSE-1.png"],
  ["exterior-envelope-drying", "2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["forensic", "2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["foundation-membership", "2021/03/HISTORY-48.png"],
  ["free-library", "2021/03/Copy-of-EDUCATIONAL-SITES-COURSE.png"],
  ["fundamental-business-framework", "2022/04/FBF.png"],
  ["glass-cleaning-course", "2022/05/GLASS-CLEANING.png"],
  ["heat-drying", "2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png"],
  ["hospitality", "2024/10/HOSPITALITY-SITES-COURSE.png"],
  ["hvac-systems-and-indoor-air-quality", "2025/07/HVAC-SYSTEMS-INDOOR-AIR-QUALITY.png"],
  ["hvacsystems", "2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["industrial-2", "2024/10/INDUSTRIAL-SITE-COURSE-2.png"],
  ["infection-control-in-child-care", "2021/02/CHILD-CARE.png"],
  ["infectious-control-for-the-business-owner", "2021/02/BUSINESS-OWNER.png"],
  ["infrared", "2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-1.png"],
  ["initial-inspection-report-course", "2021/10/INSPECTION.png"],
  ["introduction-to-creating-a-clean-air-environment", "2025/05/CLEAN-AIR-ENVIRONMENT-COVER-1.png"],
  ["introduction-to-iaq-and-mould-understanding-airborne-spread", "2025/05/AIRBORNE-SPREAD-COVER-2.png"],
  ["introduction-to-improving-indoor-air-quality-after-waterdamage", "2025/05/inproving-indoor-air-quality-after-water-damage-2.png"],
  ["introduction-to-monitoring-air-quality-job-site", "2025/04/AIR-QUALITY-JOB-SITE-COVER-2.png"],
  ["introduction-to-water-damage-restoration-course", "2023/12/water-damage-restoration-1.png"],
  ["job-safety-and-environmental-analysis-jsea-course", "2022/03/JOB-SAFETY.png"],
  ["large-loss-mastery-course-split-payment", "2022/07/Facebook-LLM-post.png"],
  ["large-loss-mastery-super-course", "2022/07/Facebook-LLM-post.png"],
  ["largelossdrying", "2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png"],
  ["laser-measure", "2023/11/LASER-DISTANCE-MEASURER-ASSISTANCE.png"],
  ["level-1-mould-remediation", "2021/08/LEVEL-1-MOULD.png"],
  ["level-2-mould-remediation", "2021/05/LEVEL-2-MOUD.png"],
  ["level-3-mould-remediation", "2021/05/LEVEL-3-MOULD.png"],
  ["litigation-support", "2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png"],
  ["marketing-course", "2021/10/MARKETING.png"],
  ["membership", "2021/03/growth.png"],
  ["microbe-clean-basic-understanding-course", "2021/02/MICROBE.png"],
  ["moisture-mapping", "2024/04/Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["moisture-meter-course", "2021/03/MOSITURE-METER.png"],
  ["mould-identification", "2023/12/mould-identification.png"],
  ["neosan-labs-product-training-course", "2021/02/NEOSAN.png"],
  ["odour-control", "2023/12/odour-1.png"],
  ["porous-drying", "2023/12/porous-1.png"],
  ["psychrometry-drying", "2023/12/PSYCHROMETRY-1-1.png"],
  ["risk-assessment-course", "2021/09/RISK-ASSESSMENT.png"],
  ["safe-work-method-statements-swms-course", "2022/03/SAFE-WORK.png"],
  ["safety-data-sheet-sds-course", "2021/05/SAFETY-DATA.png"],
  ["safety-procedures", "2023/12/water-damage.png"],
  ["science", "2024/04/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png"],
  ["smokeandsoot", "2024/04/Copy-of-drying-techniques.png"],
  ["social-media-marketing", "2024/02/social-media-marketing-1.png"],
  ["standard-operating-procedures-sop-course", "2022/03/STANDARD-OPERATING.png"],
  ["structural-drying", "2023/12/structural-drying-1.png"],
  ["structural-drying-2", "2023/12/applied-structural-drying-1.png"],
  ["submerged-items-recovery", "2024/11/SUBMERGED-ITEMS-COURSE.png"],
  ["technician-flow-chart", "2023/06/Screenshot-2023-06-19-112619.png"],
  ["timber-drying", "2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png"],
  ["timber-floor", "2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png"],
  ["ultraviolet", "2024/09/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png"],
  ["upholstery", "2024/04/Copy-of-Copy-of-drying-techniques.png"],
  ["using-air-scrubbers-and-afds", "2025/07/JOB-SITE-AIR-QUALITY.png"],
  ["using-atp-to-create-protocols", "2021/02/ATP.png"],
  ["using-ppe", "2023/12/ppe.png"],
  ["water-damage", "2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-5-1.png"],
  ["water-damage-commercial", "2023/12/water-damage-commercial-1.png"],
  ["water-damage-estimating", "2023/12/water-damage-estimating-1.png"],
  ["water-damage-marketing", "2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2-1.png"],
  ["water-extraction", "2023/12/water-extraction-1-1.png"],
  ["water-losses", "2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-1.png"],
]);
/** Characters the reviewed export uses: printable ASCII, tab and line breaks, no-break space, §,
 *  dashes, curly quotes, bullet and ellipsis. Everything else (Cyrillic or Greek look-alikes,
 *  fullwidth or mathematical letters, accents, combining marks, zero-width and bidi controls) is a
 *  finding, checked after entities are decoded. */
const UNREADABLE_CHAR_RE = /[^\t\n\r\x20-\x7E §–—‘’“”•…]/u;

/** HTML's legacy entity names, which browsers decode in text even without ";" (WHATWG named
 *  character references that have a no-semicolon form). Case-sensitive, matched as a prefix. */
const LEGACY_ENTITY_START = new RegExp(
  '^(?:' +
    ('AElig AMP Aacute Acirc Agrave Aring Atilde Auml COPY Ccedil ETH Eacute Ecirc Egrave Euml GT Iacute Icirc Igrave Iuml LT ' +
      'Ntilde Oacute Ocirc Ograve Oslash Otilde Ouml QUOT REG THORN Uacute Ucirc Ugrave Uuml Yacute aacute acirc acute aelig ' +
      'agrave amp aring atilde auml brvbar ccedil cedil cent copy curren deg divide eacute ecirc egrave eth euml frac12 frac14 ' +
      'frac34 gt iacute icirc iexcl igrave iquest iuml laquo lt macr micro middot nbsp not ntilde oacute ocirc ograve ordf ordm ' +
      'oslash otilde ouml para plusmn pound quot raquo reg sect shy sup1 sup2 sup3 szlig thorn times uacute ucirc ugrave uml ' +
      'uuml yacute yen yuml').split(' ').join('|') +
    ')'
);

export const UNREADABLE_MESSAGE =
  'GP-673: the checker cannot read this the way a browser shows it. For a course not approved in data/seed/cec-approvals.json, ' +
  'only the markup, CSS, characters and record fields already reviewed in the frozen export are accepted, because anything else ' +
  'could show a learner CEC wording this checker never sees. Remove it, or add it to the reviewed lists in scripts/check-iicrc-compliance.mjs in a reviewed change.';

const normaliseCss = (s) => s.replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').trim().toLowerCase();
const normaliseStyleBlock = (s) => normaliseCss(s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<br\s*\/?>/gi, ' '));
const decodeAttr = (s) => decodeNumericRefs(s).replace(/&([a-z]+);?/gi, (m, n) => (Object.hasOwn(ENTITIES, n.toLowerCase()) ? ENTITIES[n.toLowerCase()] : m));
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const TAG_AT = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/y;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/** Problems that make one string field unreadable to the scanner (deduplicated, in order). */
export function readabilityProblems(value, slug) {
  const problems = new Set();
  // Characters, after numeric references decode (browsers decode "&#1057;" to a Cyrillic letter).
  const bad = decodeNumericRefs(value).match(UNREADABLE_CHAR_RE);
  if (bad) problems.add(`character U+${bad[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} is outside the reviewed character set (look-alike, accent, invisible or direction control)`);
  // Named entities the scanner does not decode would show a learner a different letter: any
  // "&name;" outside ENTITIES, and "&name" without ";" when it starts with one of the legacy names
  // a browser decodes even without the semicolon ("&Ccedil" shows "Ç"). A bare "&" in a URL query
  // ("&utm-source=") is not an entity and shows as typed.
  for (const m of value.matchAll(/&([a-zA-Z][a-zA-Z0-9]*)(;?)/g)) {
    const known = m[2] && Object.hasOwn(ENTITIES, m[1].toLowerCase());
    if (!known && (m[2] || LEGACY_ENTITY_START.test(m[1]))) problems.add(`entity "${m[0]}" is not one the checker decodes`);
  }
  // <style> blocks: only an exact reviewed block, with no attributes.
  const rest = value.replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi, (_, attrs, css) => {
    if (attrs.trim() || !REVIEWED_STYLE_BLOCKS.has(normaliseStyleBlock(css))) problems.add('a <style> block that is not the reviewed one (CSS can draw, hide or reorder text)');
    return ' ';
  });
  for (let i = rest.indexOf('<'); i !== -1; i = rest.indexOf('<', i + 1)) {
    if (!/[a-zA-Z/!?]/.test(rest[i + 1] ?? '')) continue; // a literal "<" in text
    TAG_AT.lastIndex = i;
    const m = TAG_AT.exec(rest);
    if (!m) {
      problems.add('markup the checker cannot parse (comment, declaration or malformed tag)');
      continue;
    }
    const [tagText, close, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (name === 'img' && !close) {
      const reviewed = REVIEWED_IMAGES.some((r) => r.slug === slug && r.sha256 === sha256(tagText));
      if (!reviewed) problems.add('an image that has not been reviewed (text inside an image cannot be read)');
      continue;
    }
    if (!READABLE_TAGS.has(name)) {
      problems.add(`a <${name}> element (not in the reviewed markup)`);
      continue;
    }
    if (close) {
      if (attrs.trim()) problems.add(`a closing </${name}> tag with attributes`);
      continue;
    }
    for (const a of attrs.matchAll(ATTR_RE)) {
      const attr = a[1].toLowerCase();
      const val = decodeAttr(a[2] ?? a[3] ?? a[4] ?? '');
      if (!(READABLE_ATTRS[name] ?? []).includes(attr)) {
        problems.add(`a ${attr} attribute on <${name}> (not in the reviewed markup)`);
      } else if (attr === 'style') {
        for (const decl of val.split(';').map(normaliseCss).filter(Boolean)) {
          if (!READABLE_CSS.get(name)?.has(decl)) problems.add(`CSS "${decl.slice(0, 60)}" on <${name}> (not a reviewed declaration for it; CSS can hide, reorder or draw text)`);
        }
      } else if (READABLE_ATTR_VALUES[`${name}.${attr}`] && !READABLE_ATTR_VALUES[`${name}.${attr}`].includes(val.trim().toLowerCase())) {
        problems.add(`${attr}="${val.slice(0, 30)}" on <${name}> (not a reviewed value)`);
      }
    }
  }
  return [...problems];
}

/** Every string in a record with its dotted field path (keys are covered by recordShapeProblems). */
function allStrings(value, path, out) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => allStrings(v, `${path}.${i}`, out));
  else if (isPlainObject(value)) for (const [k, v] of Object.entries(value)) allStrings(v, path ? `${path}.${k}` : k, out);
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
  const seenSlugs = new Set();
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      structural(`entry ${i} is not a course record object`);
      return;
    }
    const slug = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : `<record ${i} has no slug>`;
    // GP-673: approval needs the slug EXACTLY (" approved-slug " is a different URL), and one slug
    // may appear once (a second record must not borrow the first one's approval).
    if (seenSlugs.has(slug)) structural(`slug "${slug}" appears in more than one record; one course, one record`);
    seenSlugs.add(slug);
    const isApproved = approved.has(slug) && row.slug === slug;
    const rules = [...BANNED, CEC_NUMBER, CEC_APPROVAL_PROSE, CEC_INSIDE_WORD].filter(
      (rule) => !(isApproved && (rule === CEC_NUMBER || rule === CEC_APPROVAL_PROSE || rule === CEC_INSIDE_WORD))
    );
    // GP-673: an unapproved course must be fully readable (shape, markup, CSS, characters).
    if (!isApproved) {
      const unreadable = (field, text) => findings.push({ file, slug, field, line: 0, text, message: UNREADABLE_MESSAGE });
      for (const [field, problem] of recordShapeProblems(row)) unreadable(field, problem);
      const thumb = row.thumbnail_url;
      const pinned = REVIEWED_THUMBNAILS.get(slug);
      if (typeof thumb === 'string' && thumb !== '' && (pinned === undefined || thumb !== THUMBNAIL_BASE + pinned)) {
        unreadable('thumbnail_url', 'a course-card thumbnail that is not the pinned one for this course (text inside an image cannot be read)');
      }
      for (const [field, value] of allStrings(row, '', [])) {
        for (const problem of readabilityProblems(value, slug)) unreadable(field, problem);
      }
    }
    const flags = (rule, text) =>
      rule.re.test(text) && (rule.allowlisted ? !allowlist.has(text) : !(rule.allow && rule.allow.test(text)));
    for (const [field, value] of stringFields(row, '', [])) {
      // The slug is scanned too (review r4, Codex, P1): it is the course's public URL.
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
        hitRules.add(rule);
        findings.push({ file, slug, field, line: 0, text: joined, message: `${rule.message} (claim spans several lines)` });
      }
      // Text as a browser renders it (inline tags join with no space).
      const rendered = renderedRecordText(value);
      for (const rule of rules) {
        if (hitRules.has(rule) || !flags(rule, rendered)) continue;
        hitRules.add(rule);
        findings.push({ file, slug, field, line: 0, text: rendered, message: `${rule.message} (as rendered, across inline markup)` });
      }
      // Text inside tag attributes (alt / title) renders but was removed with the tag above.
      const raw = rawRecordText(value);
      for (const rule of rules) {
        if (hitRules.has(rule) || !flags(rule, raw)) continue;
        findings.push({ file, slug, field, line: 0, text: raw, message: `${rule.message} (inside markup)` });
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
    list = execSync('git ls-files --cached --others --exclude-standard', {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (err) {
    console.error('check-iicrc-compliance: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const findings = [];
  const files = list.split('\n').map((f) => f.trim()).filter(Boolean);
  for (const file of files.filter((f) => COPY_EXT.test(f) && inScope(f) && !isExempt(f))) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
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
      findings.push(
        `  ${file}: listed as IICRC-free but could not be read — update IICRC_FREE_FILES deliberately`
      );
      continue;
    }
    findings.push(...evaluateIicrcFree(file, text));
  }

  if (findings.length > 0) {
    console.error(`\n✖ IICRC/CEC compliance guard failed — ${findings.length} issue(s)\n`);
    console.error('CARSI is an IICRC CEC provider, not a certifying body, and a course may only');
    console.error('advertise CEC hours once the founder confirms IICRC approval. Fix these:\n');
    console.error(findings.join('\n'));
    console.error(
      '\nSee CLAUDE.md § "IICRC CEC terminology". A numbered CEC line that is a genuine IICRC program-requirement fact ships ONLY by adding its exact text to scripts/iicrc-cec-allowlist.json after human review; otherwise remove the CEC number (fail-closed).\n'
    );
    process.exit(1);
  }
  console.log('✓ IICRC/CEC compliance guard passed.');
  process.exit(0);
}

if (isEntryPoint(import.meta.url)) main();
