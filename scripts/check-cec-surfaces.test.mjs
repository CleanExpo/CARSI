#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC surface-leak guard (GP-498). A guard that cannot fail is
 * worthless: this asserts the guard FIRES on every known leak shape — including the ones a
 * naive line-regex misses (computed access, aliased / multiline destructuring, Prisma
 * selects, non-trivial boolean eligibility) — and stays SILENT on the legitimate resolved
 * reads it must not touch. If someone makes the guard inert, this test goes red.
 */
import { evaluateFile } from './check-cec-surfaces.mjs';

// Each MUST_BLOCK case (scanned as its own source) must produce at least one finding.
const MUST_BLOCK = [
  ['member read (JSX render)', `const X = () => <span>{course.cecHours} CECs</span>;`],
  ['member read in marketing string', 'const copy = `Earn ${course.cecHours} IICRC CECs`;'],
  ['member read eligibility boolean', 'const show = enrollment.cecHours != null && enrollment.cecHours > 0;'],
  ['optional-chain member read', 'const n = row?.cecHours ?? 0;'],
  ['computed / bracket access', "const n = course['cecHours'];"],
  ['computed access double-quote', 'const n = course["cecHours"];'],
  ['destructure (shorthand)', 'const { cecHours } = course; renderBadge(cecHours);'],
  ['destructure (aliased)', 'const { cecHours: raw } = course; renderBadge(raw);'],
  [
    'destructure (multiline)',
    'const {\n  slug,\n  cecHours,\n  title,\n} = course;',
  ],
  ['assignment-target destructure', 'let cecHours; ({ cecHours } = course);'],
  ['Prisma select of raw column', 'const q = { select: { slug: true, cecHours: true } };'],
  [
    'Prisma select multiline',
    'const q = {\n  select: {\n    slug: true,\n    cecHours: true,\n  },\n};',
  ],
  ['discipline as eligibility (Boolean)', 'const eligible = Boolean(course.iicrcDiscipline) && isCecCourse;'],
  ['discipline as eligibility (|| in CEC fn)', 'function isCecEligible(c) { return cecApproved || Boolean(c.iicrcDiscipline); }'],
  ['discipline as eligibility (double negation)', 'const cecOk = !!course.iicrcDiscipline;'],
  ['discipline as eligibility (if + submission)', 'function f(c){ if (c.iicrcDiscipline) { return submitCec(); } return null; }'],
  ['discipline snake as eligibility', 'function f(c){ return c.iicrc_discipline ? cecEligible : false; }'],
  [
    'discipline as eligibility (multiline)',
    'function isEligibleForCec(course) {\n  return (\n    Boolean(course.iicrcDiscipline)\n  );\n}',
  ],
];

// Each MUST_PASS case must produce NO findings — gate outputs / legit reads.
const MUST_PASS = [
  ['resolved snake DTO render', `const X = () => <span>{course.cec_hours} CECs</span>;`],
  ['renamed resolved field render', `const X = () => <span>{enrollment.resolvedCecHours} CEC</span>;`],
  ['renamed resolved eligibility', 'function f(e){ return e.resolvedCecHours != null && e.resolvedCecHours > 0; }'],
  ['renamed label prop', `const X = () => <Thumb cecHoursLabel={course.cec_hours} />;`],
  ['discipline display default (nullish)', `const meta = \`\${c.iicrc_discipline ?? '—'} · \${c.cec_hours} CEC\`;`],
  ['discipline conditional DISPLAY in JSX', `const X = () => <div>{course.iicrc_discipline && <Badge>{course.iicrc_discipline} CEC</Badge>}</div>;`],
  ['discipline badge display', `const X = () => <StatusBadge label={enrollment.discipline} />;`],
  ['discipline plain label read (no CEC context)', 'const disc = course.iicrcDiscipline; setLabel(disc);'],
  ['resolver-input object key (value not a raw read)', 'formatLmsCourseCecHoursLabel({ slug: c.slug, cecHours: null });'],
  ['object write with resolver value', 'const dto = { resolvedCecHours: resolveLmsCourseCecHours({ slug }) };'],
  ['type/prop declaration', 'type T = { cecHours?: number | null };'],
  ['snake DTO type declaration', 'type T = { cec_hours?: string | null };'],
  ['function param named cecHours (bare)', 'function has(cecHours) { return Number(cecHours) > 0; }'],
  ['comment mentioning cecHours', '// the stored cecHours column is WP-import pollution'],
];

let failed = 0;

for (const [name, src] of MUST_BLOCK) {
  const findings = evaluateFile('fixture.tsx', src);
  if (findings.length === 0) {
    console.error(`✖ MUST BLOCK but passed: ${name}\n    ${src.replace(/\n/g, ' ')}`);
    failed++;
  }
}

for (const [name, src] of MUST_PASS) {
  const findings = evaluateFile('fixture.tsx', src);
  if (findings.length > 0) {
    console.error(
      `✖ MUST PASS but blocked: ${name}\n    ${src.replace(/\n/g, ' ')}\n    ${findings.join('\n    ')}`
    );
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n✖ CEC surface-leak guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ CEC surface-leak guard self-test passed (${MUST_BLOCK.length} block, ${MUST_PASS.length} pass).`);
process.exit(0);
