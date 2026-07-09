#!/usr/bin/env node
/**
 * IICRC CEC terminology guard (Linear GP-451).
 *
 * Licence-critical: CARSI is accredited as an IICRC *CEC provider* (Continuing
 * Education Credit) — "IICRC CEC Accredited". CARSI is NOT accredited to
 * deliver IICRC courses or certification — that is obtained only through
 * IICRC-approved schools and examinations. Selling copy that implies CARSI
 * grants IICRC certification, or that IICRC accredits CARSI's courses
 * generally (rather than CARSI's CEC-provider standing specifically), can
 * cost the founder's licence to sell courses, so it is a release blocker.
 *
 * This scanner blocks the banned selling phrasings in source copy. It is
 * deliberately narrow: it flags only phrases that assert CARSI delivers IICRC
 * courses/certification/accreditation, and leaves legitimate copy untouched —
 * a student's own existing IICRC certification (recert reminders, member
 * number, CEC tracking), accurate "IICRC CEC Accredited" claims, discipline
 * descriptors like "WRT-aligned", and third-person industry facts such as
 * "IICRC certification is required for insurance panels".
 *
 * Modes:
 *   node scripts/check-iicrc-terminology.mjs           # scan tracked source copy (CI + manual)
 *   node scripts/check-iicrc-terminology.mjs --staged   # scan STAGED additions only (pre-commit)
 *
 * Bypass a verified false positive: git commit --no-verify
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Banned selling/descriptive phrasings. Each must be something that implies
// CARSI itself delivers IICRC courses or IICRC certification.
const BANNED = [
  {
    // "IICRC course" / "IICRC courses" — must be "IICRC CEC course(s)".
    re: /\bIICRC[\s-]+courses?\b/i,
    // ...unless it is already the compliant "IICRC CEC course(s)" or the spelled-out form.
    allow: /\bIICRC[\s-]+(CEC|Continuing[\s-]+Education[\s-]+Credit)/i,
    message: 'Use "IICRC CEC course(s)", not "IICRC course(s)".',
  },
  {
    // "IICRC certification course(s)" / "IICRC certified course(s)".
    re: /\bIICRC[\s-]*(certification|certified)[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI does not deliver IICRC certification courses — say "IICRC CEC course(s)".',
  },
  {
    // "get/getting/become/be IICRC certified [with CARSI]" as a CARSI offering.
    re: /\b(get|getting|become|becoming|be|earn(?:ing)?)\s+IICRC[\s-]*certified\b/i,
    allow: null,
    message: 'CARSI does not make you "IICRC certified" — it delivers IICRC CEC courses.',
  },
  {
    // "get IICRC certified with CARSI" (explicit CARSI attribution).
    re: /IICRC[\s-]*certif\w*\s+with\s+CARSI/i,
    allow: null,
    message: 'Do not imply CARSI grants IICRC certification.',
  },
  {
    // Bare "IICRC Accredited" (no CEC in between) — must always be "IICRC CEC
    // Accredited". Note: this naturally does NOT match "IICRC CEC Accredited"
    // itself, since "CEC" breaks the [\s-]* adjacency between IICRC and Accredited.
    re: /\bIICRC[\s-]*Accredited\b/i,
    allow: null,
    message: 'Say "IICRC CEC Accredited", never bare "IICRC Accredited" — CARSI is accredited as a CEC provider, not accredited by IICRC generally.',
  },
  {
    // "IICRC-accredited course(s)" / "IICRC accredited course(s)" (no CEC) —
    // implies IICRC accredits the course/certification itself.
    re: /\bIICRC[\s-]*accredited[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI courses are not "IICRC-accredited" — say "IICRC CEC Accredited course(s)".',
  },
  {
    // "IICRC course(s) accredited/accreditation" (reversed word order).
    re: /\bIICRC[\s-]+courses?[\s-]+accredit\w*\b/i,
    allow: null,
    message: 'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".',
  },
  {
    // "IICRC Approved School" / "IICRC Approved Instructor" as a positive claim about
    // CARSI — Schools/Instructors are a different IICRC licence class CARSI does not hold.
    // Third-person facts ("certification is obtained through an IICRC-approved school")
    // are allowed via the preposition context.
    re: /\bIICRC[\s-]+Approved[\s-]+(School|Instructor)\b/i,
    allow: /\b(through|via|from|at)\s+(an?\s+)?IICRC[\s-]+approved\s+school\b/i,
    message: 'CARSI is not an IICRC Approved School or Instructor — never claim that status (it is a separate IICRC licence class).',
  },
  {
    // Endorsement claims. The IICRC states it "does not promote any particular
    // educational provider" — endorsement/partnership/promotion claims are banned.
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
    // Founder brand-exclusion rule (2026-07-09): COACH8 must never appear in any CARSI
    // copy or content surface (see src/lib/calendar/event-exclusions.ts for the calendar
    // enforcement of the same rule).
    re: /\bCOACH[\s-]?8\b/i,
    allow: null,
    message: 'COACH8 is excluded from all CARSI surfaces (founder brand-exclusion rule) — remove it.',
  },
];

// Only these source-copy extensions carry public/marketing/in-app strings.
const COPY_EXT = /\.(tsx?|jsx?|mdx?)$/;

// Customer-facing surfaces the guard scans. Application/site copy (app, src,
// templates) plus customer-facing marketing collateral (docs/marketing). The
// broader docs/ tree (internal engineering specs, planning) is out of scope —
// it uses technical phrasings like "non-IICRC courses" that are not selling copy.
const SCANNED_DIRS = ['app/', 'src/', 'templates/', 'docs/marketing/'];

// Seed JSON is production copy (course descriptions, marketing prose) that ships to the
// live DB via the PRE_DEPLOY seeder — scan it too (gap closed 2026-07-09).
const JSON_SCANNED_DIRS = ['data/seed/'];

function inScope(file) {
  const norm = file.replace(/\\/g, '/');
  if (COPY_EXT.test(norm) && SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  if (norm.endsWith('.json') && JSON_SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  return false;
}

/** Files intentionally exempt: this guard, the rule docs, and skill/spec text
 *  that legitimately quote the banned phrases in order to forbid them. */
const EXEMPT = [
  'scripts/check-iicrc-terminology.mjs',
  'CLAUDE.md',
  'skills/context/project-context.skill.md',
  // The course-asset-kit engine's banned-phrase scanner mirrors this guard's
  // regexes and messages, and its tests use the banned phrases as fixtures to
  // prove the scan fires — same rationale as exempting this guard itself.
  'src/lib/course-kit/iicrc-phrases.ts',
  'src/lib/course-kit/iicrc-phrases.test.ts',
  'src/lib/course-kit/scaffold.test.ts',
  // The calendar exclusion module + test enforce the COACH8 brand-exclusion rule and
  // legitimately name the excluded brand (same rationale as the phrase catalogue above).
  'src/lib/calendar/event-exclusions.ts',
  'src/lib/calendar/event-exclusions.test.ts',
];

function isExempt(file) {
  const norm = file.replace(/\\/g, '/');
  return EXEMPT.some((e) => norm === e || norm.endsWith('/' + e));
}

function scanLine(file, lineNo, content, findings) {
  for (const rule of BANNED) {
    if (rule.re.test(content) && !(rule.allow && rule.allow.test(content))) {
      findings.push(`  ${file}:${lineNo}: ${rule.message}\n    → ${content.trim().slice(0, 140)}`);
    }
  }
}

const staged = process.argv.includes('--staged');
const findings = [];

if (staged) {
  // Pre-commit: scan STAGED additions only, no context lines (matches check-secrets).
  let diff = '';
  try {
    diff = execSync('git diff --cached --no-color -U0', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error('check-iicrc-terminology: failed to read staged diff:', err.message);
    process.exit(1);
  }
  let currentFile = null;
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      lineNo = parseInt(hunk[1], 10);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (!currentFile || !inScope(currentFile) || isExempt(currentFile)) continue;
    scanLine(currentFile, lineNo, line.slice(1), findings);
    lineNo++;
  }
} else {
  // CI / manual: scan all tracked source-copy files.
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    console.error('check-iicrc-terminology: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const files = list
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && inScope(f) && !isExempt(f));
  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      scanLine(file, i + 1, lines[i], findings);
    }
  }
}

if (findings.length > 0) {
  console.error('\n✖ IICRC CEC terminology guard failed (Linear GP-451)\n');
  console.error('CARSI sells IICRC *CEC courses*, not IICRC certification. Fix these:\n');
  console.error(findings.join('\n'));
  console.error(
    '\nSee CLAUDE.md § "IICRC CEC terminology". Use "IICRC CEC course(s)" and never imply' +
      '\nCARSI delivers IICRC certification. Verified false positive? git commit --no-verify\n'
  );
  process.exit(1);
}

console.log('✓ IICRC CEC terminology guard passed.');
process.exit(0);
