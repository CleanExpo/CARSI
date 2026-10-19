#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC surface-leak guard (GP-498). A guard that cannot fail is
 * worthless: this asserts the guard FIRES on every known leak shape — including the ones a
 * naive line-regex misses (computed access, aliased / multiline destructuring, Prisma
 * selects, non-trivial boolean eligibility) — and stays SILENT on the legitimate resolved
 * reads it must not touch. If someone makes the guard inert, this test goes red.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { evaluateFile } from './check-cec-surfaces.mjs';
import { IICRC_CODES } from './iicrc-codes.mjs';

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
  ['computed access via const string key', "const k = 'cecHours'; const n = course[k];"],
  ['aliased-shorthand discipline eligibility', 'function f(c){ const { iicrcDiscipline: d } = c; return Boolean(d) && isCec; }'],
  ['aliased-var discipline eligibility', 'function f(c){ const disc = c.iicrcDiscipline; const cecOk = Boolean(disc); return cecOk; }'],
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
  ['non-cec const key computed access', "const k = 'title'; const t = course[k];"],
  ['aliased discipline used for DISPLAY only', 'function f(c){ const { iicrcDiscipline: d } = c; return d ? d.toUpperCase() : "n/a"; }'],
  ['comment mentioning cecHours', '// the stored cecHours column is WP-import pollution'],
];

// Rule 4: recognition surfaces (gamification + LinkedIn share), scanned under their real paths.
// The first six are the shapes that shipped and passed rules 1-3 until 19/10/2026.
const PAGE = 'app/(dashboard)/dashboard/student/leaderboard/page.tsx';
const RECOGNITION_BLOCK = [
  ['CEC achievement milestone', PAGE, "const m = { id: 'cec', label: 'Approved IICRC CEC hours', earned: cec > 0 };"],
  ['CEC tile beside XP', PAGE, 'const X = () => <dt className="t">Approved IICRC CEC</dt>;'],
  ['CEC field in the XP level payload', 'src/lib/server/learner-xp.ts', 'export const p = { total_xp, total_cec_lifetime };'],
  ['leaderboard filter by IICRC code', 'app/api/lms/gamification/leaderboard/route.ts', "const DISCIPLINES = new Set(['WRT', 'OCT']);"],
  ['leaderboard SQL on iicrc_discipline', 'src/lib/server/leaderboard-xp.ts', 'const q = prisma.$queryRaw`SELECT 1 FROM lms_courses c WHERE c.iicrc_discipline = ${d}`;'],
  ['LinkedIn name with discipline code', 'src/components/lms/LinkedInShareButton.tsx', 'const name = `${courseTitle} (${iicrcDiscipline})`;'],
  ['continuing-education wording', 'src/components/lms/AchievementsPanel.tsx', 'const X = () => <p>Earn continuing education credits</p>;'],
  ['IICRC acronym in a new gamification file', 'src/lib/gamification/badges.ts', "export const badge = 'ASD expert';"],
  // One case per code family (review r1 of fc1dca5c: 'HST certificate' passed a private 8-code list).
  ['health and safety code (HST)', 'src/lib/gamification/badges.ts', "export const badge = 'HST certificate';"],
  ['repair code (RRT)', 'src/components/lms/LinkedInShareButton.tsx', 'const name = `${courseTitle} (RRT)`;'],
  ['maintenance code (CCMT)', PAGE, 'const X = () => <p>CCMT milestone unlocked</p>;'],
  ['upholstery code (UFT)', 'src/lib/server/leaderboard-xp.ts', "const label = 'UFT leaders';"],
  ['Master/Journeyman designation (JWR)', PAGE, "const t = 'JWR track';"],
  ['former code (BMT)', PAGE, "const t = 'BMT badge';"],
  // Review r3 of ee2d5120: the acronym match was case-sensitive, so these passed.
  ['mixed-case code (Wrt)', 'src/lib/gamification/badges.ts', "export const badge = 'Wrt certificate';"],
  ['lower-case code (hst)', PAGE, 'const X = () => <p>hst badge</p>;'],
];
const RECOGNITION_PASS = [
  ['XP, level and a long month name', PAGE, 'const X = () => <p>October 2026 · 250 XP · Level 2 · Apprentice</p>;'],
  // Word boundaries stay: a code inside an ordinary word is not a code.
  ['code as a substring of ordinary words', PAGE, "const t = 'Science basics: a description of hosting, uncrtain octal';"],
  ['comment mentioning CEC', PAGE, '// CEC hours live on Credentials and the renewal cockpit\nconst n = 1;'],
  ['renewal summary route is the CEC surface', 'app/api/lms/gamification/me/renewal-summary/route.ts', 'export const r = { cec_hours: 8, total_cec_lifetime: 8 };'],
  ['CEC on a non-recognition surface', 'src/components/lms/RenewalCockpit.tsx', 'const X = () => <span>8 CEC</span>;'],
  ['LinkedIn share by course title', 'src/components/lms/LinkedInShareButton.tsx', "const p = { name: courseTitle, organizationId: '65591140' };"],
];

let failed = 0;

for (const [name, file, src] of RECOGNITION_BLOCK) {
  if (evaluateFile(file, src).length === 0) {
    console.error(`✖ MUST BLOCK but passed: ${name} (${file})\n    ${src}`);
    failed++;
  }
}
// Every code in the shared list is blocked on a recognition surface.
for (const code of IICRC_CODES) {
  if (evaluateFile('src/lib/gamification/badges.ts', `export const badge = '${code} badge';`).length === 0) {
    console.error(`✖ MUST BLOCK but passed: IICRC code ${code} on a recognition surface`);
    failed++;
  }
}

// Rule 4 really reads the shared list: a guard copy whose data/iicrc-codes.json lacks HST must
// miss HST and still catch WRT. The copy keeps the scripts/ + data/ layout and sits under
// node_modules/.cache so it resolves the real typescript package.
{
  const here = dirname(fileURLToPath(import.meta.url));
  const tmp = join(here, '..', 'node_modules', '.cache', `cec-surfaces-codes-probe-${process.pid}`);
  try {
    mkdirSync(join(tmp, 'scripts'), { recursive: true });
    mkdirSync(join(tmp, 'data'), { recursive: true });
    for (const f of ['check-cec-surfaces.mjs', 'iicrc-codes.mjs']) {
      cpSync(join(here, f), join(tmp, 'scripts', f));
    }
    const data = JSON.parse(readFileSync(join(here, '..', 'data', 'iicrc-codes.json'), 'utf8'));
    const before = data.certifications.length;
    data.certifications = data.certifications.filter((e) => e.code !== 'HST');
    if (data.certifications.length !== before - 1) throw new Error('could not remove HST from the data copy');
    writeFileSync(join(tmp, 'data', 'iicrc-codes.json'), JSON.stringify(data));
    const probe = await import(pathToFileURL(join(tmp, 'scripts', 'check-cec-surfaces.mjs')).href);
    const file = 'src/lib/gamification/badges.ts';
    if (probe.evaluateFile(file, "export const b = 'HST certificate';").length !== 0) {
      console.error('✖ rule 4 still caught HST after it left the shared list: it is not reading data/iicrc-codes.json');
      failed++;
    }
    if (probe.evaluateFile(file, "export const b = 'WRT certificate';").length === 0) {
      console.error('✖ shared-list probe is vacuous: the copied guard did not catch WRT either');
      failed++;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

for (const [name, file, src] of RECOGNITION_PASS) {
  const findings = evaluateFile(file, src);
  if (findings.length > 0) {
    console.error(`✖ MUST PASS but blocked: ${name} (${file})\n    ${findings.join('\n    ')}`);
    failed++;
  }
}

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
console.log(
  `✓ CEC surface-leak guard self-test passed (${MUST_BLOCK.length + RECOGNITION_BLOCK.length + IICRC_CODES.length} block, ${MUST_PASS.length + RECOGNITION_PASS.length} pass).`
);
process.exit(0);
