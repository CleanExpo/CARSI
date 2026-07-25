#!/usr/bin/env node
/**
 * CEC surface-leak guard (licence-critical) — the STRUCTURAL backstop (GP-498).
 *
 * WHY THIS EXISTS. `check-iicrc-compliance.mjs` scans authored *copy* (data/seed,
 * public/courses, docs) for banned phrasings and specific CEC-hour claims. It does NOT
 * look at application code, so a whole class of leak slipped past it: a page, component,
 * PDF, email or API route that reads the RAW course CEC value and renders a CEC
 * display / eligibility / marketing signal WITHOUT going through the approvals registry.
 * Patching those surfaces one-by-one did not converge (6 review cycles) because there was
 * no mechanical enumeration of them. This guard is that enumeration.
 *
 * THE STRUCTURAL BOUNDARY.
 *   - The single source of truth for CEC hours is the approvals registry
 *     (`data/seed/cec-approvals.json`), read ONLY via `getApprovedCecHours(slug)` and the
 *     resolvers built on it (`resolveLmsCourseCecHours`, `resolveCecHours`,
 *     `resolveEffectiveCecHours`, `courseEligibleForIicrcCecSubmission`).
 *   - The RAW Prisma / catalog column is camelCase `cecHours` (a number). In the Prisma
 *     client every `LmsCourse` / `LmsEnrollment` / catalog row exposes it as `.cecHours`.
 *     Reading that raw value and letting it reach a surface bypasses the registry — that is
 *     exactly the leak that rendered "N IICRC CECs" for unapproved courses on prod.
 *   - The RESOLVED display value flows as the snake_case DTO field `cec_hours` (a string
 *     produced by the resolvers / `formatCecHoursForDisplay`). That is the gate's OUTPUT and
 *     is deliberately NOT scanned — surfaces are supposed to read it.
 *   - `iicrcDiscipline` is a course label, NOT IICRC approval; using its truthiness as a
 *     CEC / submission eligibility signal is a fail-open leak (a non-empty discipline made a
 *     course "eligible" without a registry approval — GP-498).
 *
 * THE RULE. Outside the allow-listed accessor modules, application code must not:
 *   1. read the raw camelCase column `.cecHours` (member access or destructure); or
 *   2. use `iicrcDiscipline` / `iicrc_discipline` as a CEC / eligibility boolean.
 * Every displayed / eligibility / marketing CEC value must instead come from the registry
 * accessor. Fix a flagged surface by routing it through `resolveLmsCourseCecHours` /
 * `getApprovedCecHours` / `courseEligibleForIicrcCecSubmission`, never by weakening this guard.
 *
 *   node scripts/check-cec-surfaces.mjs     # scan tracked app code (CI + manual)
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Application code to scan. Components and lib live under src/ in this repo; the extra
 *  top-level dirs are included defensively in case that ever changes. */
const SCANNED_DIRS = ['app/', 'src/', 'components/', 'lib/'];
const CODE_EXT = /\.(tsx?|jsx?)$/;

/**
 * Accessor cluster — reading the raw `cecHours` column and deciding CEC eligibility is the
 * whole job of these modules; they are the ONE place the raw value is legitimately handled.
 * A course only becomes CEC-bearing through code in this list.
 */
const ACCESSOR_ALLOWLIST = [
  'src/lib/seed/cec-approvals.ts',       // getApprovedCecHours — registry SSOT
  'src/lib/seed/cec-hours.ts',           // resolveCecHours / resolveCatalogCecHours
  'src/lib/server/course-cec-hours.ts',  // resolveLmsCourseCecHours / label
  'src/lib/server/iicrc-cec-submission.ts', // resolvedCecHoursForCourse + submission
  'src/lib/server/iicrc-cec-config.ts',  // resolveEffectiveCecHours / courseEligibleForIicrcCecSubmission
  'src/lib/server/iicrc-cec-email.ts',   // formats the already-resolved submission value
  'src/lib/cec-display.ts',              // formatCecHoursForDisplay — pure formatter
  'src/lib/course-kit/cec-guard.ts',     // course-kit CEC guard infra

  // Admin edit / write cluster. These are the founder's course-management surfaces: they
  // read the RAW stored `cecHours` so it can be EDITED, always alongside the resolved
  // registry figure (`resolvedCecHours` / `cecMissing`). They are not public display /
  // eligibility / marketing surfaces — the leak class this guard exists to stop. The admin
  // "N CEC" badge itself derives from the resolved value, not the raw column.
  'src/lib/admin/admin-courses-service.ts',            // courseToAdminDto — raw beside resolvedCecHours
  'src/components/admin/courses/CourseEditorForm.tsx', // editor prefill of the raw stored value
  'app/api/admin/iicrc-cec-submissions/route.ts',      // admin submission override (ignored by the gate)
  'app/api/admin/iicrc-cec-submissions/process/route.ts',
];

function inScope(f) {
  const n = f.replace(/\\/g, '/');
  return SCANNED_DIRS.some((d) => n.startsWith(d));
}
function isExempt(f) {
  const n = f.replace(/\\/g, '/');
  if (/(?:\.test\.|\.spec\.)/.test(n)) return true;             // unit tests exercise the accessors
  if (/(?:^|\/)__tests__\//.test(n) || /(?:^|\/)__fixtures__\//.test(n)) return true;
  return ACCESSOR_ALLOWLIST.some((e) => n === e || n.endsWith('/' + e));
}

const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

/** Member-access or destructure READ of the raw camelCase `cecHours` column. */
function readsRawCecColumn(line) {
  if (/\.cecHours\b/.test(line)) return true;                    // x.cecHours / row?.cecHours
  // object destructure: `{ ... cecHours ... } =` (not an object-literal key `cecHours:`)
  if (/\{[^{}]*\bcecHours\b(?!\s*[:?])[^{}]*\}\s*=[^=>]/.test(line)) return true;
  return false;
}

// `iicrcDiscipline` used as a CEC / eligibility boolean (fail-open leak), not a mere label read.
const IICRC_DISC_READ = /(?:[.(]\s*|\b(?:Boolean|if)\s*\(\s*)iicrc(?:Discipline|_discipline)\b/;
const IICRC_DISC_WRITE = /\biicrc(?:Discipline|_discipline)\s*[:=][^=]/; // object key / assignment target
const ELIGIBILITY_CTX = /\b(eligib\w*|cec\w*|submit\w*|submission\w*|approv\w*)\b/i;
// Genuine boolean / eligibility logic. A ternary `a ? b : c` counts, but nullish-coalescing
// `??` and optional chaining `?.` (both used for DISPLAY defaults, e.g. `discipline ?? '—'`)
// do NOT — they were the source of false positives on credential display lines.
const BOOLEAN_CTX = /(\bif\s*\(|(?<!\?)\?(?![.?])|&&|\|\||\bBoolean\s*\(|===|!==|\breturn\s)/;

function usesDisciplineAsEligibility(line) {
  if (!/iicrc(?:Discipline|_discipline)/.test(line)) return false;
  if (IICRC_DISC_WRITE.test(line) && !IICRC_DISC_READ.test(line)) return false; // pure write/label
  return IICRC_DISC_READ.test(line) && ELIGIBILITY_CTX.test(line) && BOOLEAN_CTX.test(line);
}

export function evaluateLine(file, lineNo, line, findings) {
  if (isCommentLine(line)) return;
  if (readsRawCecColumn(line)) {
    findings.push(
      `  ${file}:${lineNo}: raw CEC column read — route through the registry accessor ` +
        `(resolveLmsCourseCecHours/getApprovedCecHours), do not read \`.cecHours\` directly.\n` +
        `    → ${line.trim().slice(0, 160)}`
    );
  }
  if (usesDisciplineAsEligibility(line)) {
    findings.push(
      `  ${file}:${lineNo}: iicrcDiscipline used as a CEC/eligibility signal — eligibility must ` +
        `come from registry-approved hours (courseEligibleForIicrcCecSubmission), not discipline truthiness.\n` +
        `    → ${line.trim().slice(0, 160)}`
    );
  }
}

export function evaluateFile(file, text) {
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) evaluateLine(file, i + 1, lines[i], findings);
  return findings;
}

export { inScope, isExempt, readsRawCecColumn, usesDisciplineAsEligibility, ACCESSOR_ALLOWLIST };

// Run the scanner only when invoked directly (not when imported by the self-test).
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (err) {
    console.error('check-cec-surfaces: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const findings = [];
  for (const file of list
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && CODE_EXT.test(f) && inScope(f) && !isExempt(f))) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    findings.push(...evaluateFile(file, text));
  }

  if (findings.length > 0) {
    console.error(`\n✖ CEC surface-leak guard failed — ${findings.length} leaking surface(s)\n`);
    console.error('These read the raw course CEC value (or use iicrcDiscipline as eligibility) and');
    console.error('can render an un-approved CEC claim, bypassing the approvals registry. Route each');
    console.error('through the registry accessor (see scripts/check-cec-surfaces.mjs header):\n');
    console.error(findings.join('\n'));
    console.error(
      '\nThe resolved display DTO `cec_hours` (snake_case) is the gate output and is fine to read.\n' +
        'Verified false positive? Tighten the rule, never weaken the boundary.\n'
    );
    process.exit(1);
  }
  console.log('✓ CEC surface-leak guard passed — no raw CEC reads outside the accessor cluster.');
  process.exit(0);
}
