#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC surface-leak guard (GP-498). A guard that cannot fail is
 * worthless: this asserts the guard FIRES on every known leak shape and stays SILENT on the
 * legitimate resolved-value reads it must not touch. If someone "fixes" the guard by making
 * it inert, this test goes red.
 */
import {
  evaluateFile,
  readsRawCecColumn,
  usesDisciplineAsEligibility,
} from './check-cec-surfaces.mjs';

// Each MUST_BLOCK line, scanned on its own, must produce at least one finding.
const MUST_BLOCK = [
  ['raw column render (JSX)', `<span>{course.cecHours} CECs</span>`],
  ['raw column in marketing string', 'const copy = `Earn ${course.cecHours} IICRC CECs`;'],
  ['raw column eligibility boolean', 'const show = enrollment.cecHours != null && enrollment.cecHours > 0;'],
  ['raw column via optional chain', 'const n = row?.cecHours ?? 0; return n;'],
  ['raw column destructure', 'const { cecHours } = course; renderBadge(cecHours);'],
  ['discipline as eligibility (Boolean)', 'const eligible = Boolean(course.iicrcDiscipline) && isCecCourse;'],
  ['discipline as eligibility (truthy || in CEC ctx)', 'return cecApproved || Boolean(course.iicrcDiscipline?.trim()); // cec eligibility'],
  ['discipline as eligibility (if + submission)', 'if (course.iicrcDiscipline) { return submitCecToIicrc(); }'],
];

// Each MUST_PASS line must produce NO findings — these are the gate's own outputs / legit reads.
const MUST_PASS = [
  ['resolved snake DTO render', `<span>{course.cec_hours} CECs</span>`],
  ['resolved renamed field render', `<span>{enrollment.resolvedCecHours} CEC</span>`],
  ['resolved renamed eligibility', 'return enrollment.resolvedCecHours != null && enrollment.resolvedCecHours > 0;'],
  ['discipline display default (nullish)', `const meta = \`\${c.iicrc_discipline ?? '—'} · \${c.cec_hours} CEC\`;`],
  ['discipline badge display', '<StatusBadge label={enrollment.discipline} tone="info" />'],
  ['discipline plain label read (no eligibility)', 'const disc = course.iicrcDiscipline; setLabel(disc);'],
  ['resolver-input object key (value has no raw read)', 'formatLmsCourseCecHoursLabel({ slug: c.slug, cecHours: null });'],
  ['type/prop declaration', '  cecHours?: number | null;'],
  ['snake DTO type declaration', '  cec_hours?: string | null;'],
  ['comment mentioning cecHours', '// the stored cecHours column is WP-import pollution'],
  ['resolver call by slug only', 'cecHours: resolveLmsCourseCecHours({ slug: e.course.slug }),'],
];

let failed = 0;

for (const [name, line] of MUST_BLOCK) {
  const findings = evaluateFile('fixture.tsx', line);
  if (findings.length === 0) {
    console.error(`✖ MUST BLOCK but passed: ${name}\n    ${line}`);
    failed++;
  }
}

for (const [name, line] of MUST_PASS) {
  const findings = evaluateFile('fixture.tsx', line);
  if (findings.length > 0) {
    console.error(`✖ MUST PASS but blocked: ${name}\n    ${line}\n    ${findings.join('\n    ')}`);
    failed++;
  }
}

// Unit-level sanity: the two detectors are independently non-vacuous.
if (!readsRawCecColumn('x.cecHours')) {
  console.error('✖ readsRawCecColumn failed to detect a member read');
  failed++;
}
if (readsRawCecColumn('x.cec_hours')) {
  console.error('✖ readsRawCecColumn wrongly flagged the resolved snake DTO field');
  failed++;
}
if (!usesDisciplineAsEligibility('const ok = Boolean(c.iicrcDiscipline); // cec')) {
  console.error('✖ usesDisciplineAsEligibility failed to detect an eligibility use');
  failed++;
}

if (failed > 0) {
  console.error(`\n✖ CEC surface-leak guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ CEC surface-leak guard self-test passed (${MUST_BLOCK.length} block, ${MUST_PASS.length} pass).`);
process.exit(0);
