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

/** Founder-approved IICRC-CEC course slugs. Empty until a course is confirmed IICRC-approved.
 *  Adding a slug here is the ONLY way a specific CEC-hour claim for it passes this guard. */
const CEC_APPROVED_SLUGS = [];

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

/** A specific IICRC-CEC hour claim (e.g. "8 IICRC CECs", "5 IICRC CEC hours", "(CEC) : 3 Hours").
 *  Legitimate ONLY for a founder-approved slug. `allow` exempts IICRC recert-requirement facts
 *  (e.g. "14 CECs per 4-year cycle"), which describe the IICRC program, not a CARSI course. */
const CEC_NUMBER = {
  re: /\b\d+(?:\.\d+)?\s*IICRC\s+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)|\((?:IICRC\s+)?CEC\)\s*:?\s*\d+(?:\.\d+)?\s*Hours?/i,
  allow: /\bper\s+(?:\d+[\s-]*year|cycle|recert|renewal)|every\s+\d+\s+years|recertification|maintain(?:ing)?\s+(?:an?\s+)?(?:existing\s+)?IICRC/i,
  message: 'Specific IICRC CEC-hour claim: only allowed for a founder-approved course (add slug to CEC_APPROVED_SLUGS).',
};

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

function scanLine(file, lineNo, content, findings) {
  // A specific CEC-hour claim is exempt ONLY when the file belongs to a founder-approved
  // course — i.e. its path contains a slug listed in CEC_APPROVED_SLUGS (empty = none approved).
  const nf = file.replace(/\\/g, '/');
  const cecApproved = CEC_APPROVED_SLUGS.some((slug) => nf.includes(slug));
  for (const rule of [...BANNED, CEC_NUMBER]) {
    if (rule === CEC_NUMBER && cecApproved) continue;
    if (rule.re.test(content) && !(rule.allow && rule.allow.test(content))) {
      findings.push(`  ${file}:${lineNo}: ${rule.message}\n    → ${content.trim().slice(0, 150)}`);
    }
  }
}

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
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) scanLine(file, i + 1, lines[i], findings);
}

if (findings.length > 0) {
  console.error(`\n✖ IICRC/CEC compliance guard failed — ${findings.length} issue(s)\n`);
  console.error('CARSI is an IICRC CEC provider, not a certifying body, and a course may only');
  console.error('advertise CEC hours once the founder confirms IICRC approval. Fix these:\n');
  console.error(findings.join('\n'));
  console.error('\nSee CLAUDE.md § "IICRC CEC terminology". Verified false positive? Refine the rule\'s allow-list, do not weaken it.\n');
  process.exit(1);
}
console.log('✓ IICRC/CEC compliance guard passed.');
process.exit(0);
