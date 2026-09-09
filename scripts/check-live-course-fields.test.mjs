#!/usr/bin/env node
/**
 * Self-test for check-live-course-fields.mjs.
 *
 * Every case below plants a defect and asserts the guard REPORTS it. The first observed state
 * of a new control must be red, or it has only been tested for its ability to agree with you.
 *
 * Each non-vacuity case asserts its PRECONDITION before asserting the verdict: a control that
 * removes a token which was never present has planted nothing, and its pass means nothing.
 *
 * Run: node scripts/check-live-course-fields.test.mjs   (exit 0 = all passed)
 */
import { evaluateCourse, evaluateRun, parseApprovals, BANNED_ACRONYMS, TEXT_FIELDS } from './check-live-course-fields.mjs';

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const APPROVALS = parseApprovals(JSON.stringify({
  approvals: [
    { slug: 'approved-one', status: 'approved', approvedHours: 1 },
    { slug: 'approved-two', status: 'approved', approvedHours: 2 },
    { slug: 'pending-one', status: 'pending', approvedHours: 1 },
  ],
}));

// ---------------------------------------------------------------- positive control
// Before trusting any "no violations" result, prove a clean record CAN return clean.
// Otherwise a guard that flags everything and a guard that works look identical.
check('positive control: a clean record yields no violations', () => {
  const clean = {
    slug: 'clean-course',
    title: 'Water Damage Restoration — Essentials',
    description: 'A concise introduction to water damage restoration fundamentals.',
    short_description: 'Essentials of water damage restoration.',
    iicrc_discipline: null,
    cec_hours: null,
  };
  const v = evaluateCourse(clean, APPROVALS);
  assert(v.length === 0, `expected clean, got: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------- 1. discipline field
check('iicrc_discipline populated is a violation', () => {
  const base = { slug: 'x', title: 'Clean Title', iicrc_discipline: null, cec_hours: null };
  assert(evaluateCourse(base, APPROVALS).length === 0, 'PRECONDITION: base record must be clean, else this mutant proves nothing');

  const bad = { ...base, iicrc_discipline: 'WRT' };
  const v = evaluateCourse(bad, APPROVALS);
  assert(v.length === 1, `expected exactly 1 violation, got ${v.length}: ${JSON.stringify(v)}`);
  assert(/iicrc_discipline/.test(v[0]), `violation must name the field, got: ${v[0]}`);
  assert(/WRT/.test(v[0]), `violation must name the offending value, got: ${v[0]}`);
});

check('iicrc_discipline compound value ("WRT / ASD") is a violation', () => {
  // Measured in production 2026-09-06: two rows held "WRT / ASD", not a bare acronym.
  // A rule matching only single acronyms would pass over them.
  const v = evaluateCourse({ slug: 'x', title: 'T', iicrc_discipline: 'WRT / ASD', cec_hours: null }, APPROVALS);
  assert(v.some((s) => /iicrc_discipline/.test(s)), `compound discipline must be caught, got: ${JSON.stringify(v)}`);
});

check('empty-string discipline is NOT a violation', () => {
  // Guard against over-firing: '' is falsy and means "not set", same as null.
  const v = evaluateCourse({ slug: 'x', title: 'T', iicrc_discipline: '', cec_hours: null }, APPROVALS);
  assert(v.length === 0, `empty string must not fire, got: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------- 2. "-aligned" phrasing
for (const field of TEXT_FIELDS) {
  check(`"-aligned" phrasing in ${field} is a violation`, () => {
    const base = { slug: 'x', title: 'T', description: 'd', short_description: 's', iicrc_discipline: null, cec_hours: null };
    assert(evaluateCourse(base, APPROVALS).length === 0, 'PRECONDITION: base must be clean');

    const bad = { ...base, [field]: 'Applied Structural Drying (ASD-aligned)' };
    const v = evaluateCourse(bad, APPROVALS);
    assert(v.some((s) => s.startsWith(field) && /aligned/.test(s)), `expected an "-aligned" finding on ${field}, got: ${JSON.stringify(v)}`);
  });
}

// ---------------------------------------------------------------- 3. bare acronyms
for (const acronym of BANNED_ACRONYMS) {
  check(`bare acronym ${acronym} in title is a violation`, () => {
    const v = evaluateCourse(
      { slug: 'x', title: `Introduction to ${acronym} Methods`, iicrc_discipline: null, cec_hours: null },
      APPROVALS,
    );
    assert(v.some((s) => s.includes(acronym)), `expected ${acronym} to be caught, got: ${JSON.stringify(v)}`);
  });
}

// ------------------------------------------------- 3b. LOWER-CASE bypass (regression, P1)
// An independent reviewer demonstrated on 2026-09-07 that this guard was fail-OPEN: both
// checks were case-sensitive, so `wrt-aligned` and a bare `wrt` returned ZERO violations.
// Course text is authored in the admin UI and is often lower-case or slug-derived, so the
// lower-case form is the likely shape of the defect. These are the reviewer's exact cases.
for (const acronym of BANNED_ACRONYMS) {
  check(`LOWER-CASE bare acronym ${acronym.toLowerCase()} in title is a violation`, () => {
    const v = evaluateCourse(
      { slug: 'x', title: `introduction to ${acronym.toLowerCase()} methods`, iicrc_discipline: null, cec_hours: null },
      APPROVALS,
    );
    assert(v.some((s) => s.includes(acronym)), `lower-case ${acronym.toLowerCase()} bypassed the guard, got: ${JSON.stringify(v)}`);
  });
}

check('LOWER-CASE "-aligned" phrasing is a violation', () => {
  const v = evaluateCourse(
    { slug: 'x', title: 'applied structural drying (wrt-aligned)', iicrc_discipline: null, cec_hours: null },
    APPROVALS,
  );
  assert(v.some((s) => /aligned/.test(s)), `lower-case "-aligned" bypassed the guard, got: ${JSON.stringify(v)}`);
});

check('MIXED-CASE "-aligned" phrasing is a violation', () => {
  const v = evaluateCourse(
    { slug: 'x', title: 'Applied Structural Drying (Wrt-Aligned)', iicrc_discipline: null, cec_hours: null },
    APPROVALS,
  );
  assert(v.some((s) => /aligned/.test(s)), `mixed-case "-aligned" bypassed the guard, got: ${JSON.stringify(v)}`);
});

check('acronym embedded in a longer word does NOT fire', () => {
  // \b anchoring: "ASDIC" and "octopus" must not be read as ASD and OCT.
  const v = evaluateCourse(
    { slug: 'x', title: 'Understanding ASDIC and octopus habitats', iicrc_discipline: null, cec_hours: null },
    APPROVALS,
  );
  assert(v.length === 0, `substring match fired incorrectly: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------- 4. CEC claims
check('CEC claim with no registry entry is a violation', () => {
  const v = evaluateCourse({ slug: 'not-in-registry', title: 'T', iicrc_discipline: null, cec_hours: 1 }, APPROVALS);
  assert(v.some((s) => /NO entry/.test(s)), `expected an unapproved-CEC finding, got: ${JSON.stringify(v)}`);
});

check('CEC claim against a non-approved status is a violation', () => {
  const v = evaluateCourse({ slug: 'pending-one', title: 'T', iicrc_discipline: null, cec_hours: 1 }, APPROVALS);
  assert(v.some((s) => /status/.test(s)), `expected a status finding, got: ${JSON.stringify(v)}`);
});

check('CEC hours disagreeing with the approved figure is a violation', () => {
  const v = evaluateCourse({ slug: 'approved-two', title: 'T', iicrc_discipline: null, cec_hours: 7 }, APPROVALS);
  assert(v.some((s) => /approved figure is 2/.test(s)), `expected an hours-mismatch finding, got: ${JSON.stringify(v)}`);
});

check('CEC claim matching an approved entry is clean', () => {
  const v = evaluateCourse({ slug: 'approved-one', title: 'T', iicrc_discipline: null, cec_hours: 1 }, APPROVALS);
  assert(v.length === 0, `approved claim must pass, got: ${JSON.stringify(v)}`);
});

check('cec_hours of 0 or null is not a claim', () => {
  for (const h of [0, null, undefined]) {
    const v = evaluateCourse({ slug: 'not-in-registry', title: 'T', iicrc_discipline: null, cec_hours: h }, APPROVALS);
    assert(v.length === 0, `cec_hours=${h} must not be treated as a claim, got: ${JSON.stringify(v)}`);
  }
});

// ---------------------------------------------------------------- non-vacuity rules
// These are the rules most likely to be silently wrong, because their failure mode is a
// comfortable pass rather than a crash.
check('an empty approvals registry exits 2, not 1', () => {
  const r = evaluateRun({ scanned: 80, unreachable: 0, total: 80, approvalsCount: 0, findings: [{ slug: 'a' }] });
  assert(r.code === 2, `expected 2 (cannot judge), got ${r.code}: ${r.reason}`);
  assert(/ZERO entries/.test(r.reason), `reason must name the empty registry, got: ${r.reason}`);
});

check('scanning zero courses exits 2, not 0', () => {
  const r = evaluateRun({ scanned: 0, unreachable: 0, total: 80, approvalsCount: 38, findings: [] });
  assert(r.code === 2, `reaching nothing must not pass, got ${r.code}: ${r.reason}`);
});

check('an incomplete scan exits 2 even with no findings', () => {
  const r = evaluateRun({ scanned: 79, unreachable: 1, total: 80, approvalsCount: 38, findings: [] });
  assert(r.code === 2, `a partial scan must not report clean, got ${r.code}: ${r.reason}`);
});

check('a complete clean scan exits 0', () => {
  const r = evaluateRun({ scanned: 80, unreachable: 0, total: 80, approvalsCount: 38, findings: [] });
  assert(r.code === 0, `expected 0, got ${r.code}: ${r.reason}`);
});

check('a complete scan with findings exits 1', () => {
  const r = evaluateRun({ scanned: 80, unreachable: 0, total: 80, approvalsCount: 38, findings: [{ slug: 'a' }, { slug: 'b' }] });
  assert(r.code === 1, `expected 1, got ${r.code}: ${r.reason}`);
  assert(/2 live course/.test(r.reason), `reason must count the findings, got: ${r.reason}`);
});

// ---------------------------------------------------------------- registry parsing
check('parseApprovals reads the documented shape and is non-empty', () => {
  const m = parseApprovals(JSON.stringify({ version: 1, approvals: [{ slug: 's', status: 'approved', approvedHours: 3 }] }));
  assert(m.size === 1, `expected 1 entry, got ${m.size}`);
  assert(m.get('s').hours === 3, 'approvedHours must be read');
});

check('parseApprovals on a stub with an empty array yields size 0, which evaluateRun refuses', () => {
  // The real failure, measured 2026-09-06: a local checkout held a 510-byte stub with
  // "approvals": []. Parsing succeeds; the danger is treating the result as authoritative.
  const m = parseApprovals(JSON.stringify({ version: 1, approvals: [] }));
  assert(m.size === 0, 'stub must parse to zero');
  const r = evaluateRun({ scanned: 80, unreachable: 0, total: 80, approvalsCount: m.size, findings: [] });
  assert(r.code === 2, 'a zero-entry registry must force exit 2');
});

// ---------------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL — ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK — ${passed} checks passed.`);
