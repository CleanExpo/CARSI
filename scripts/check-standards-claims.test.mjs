#!/usr/bin/env node
/**
 * Proof the standards-claim guard catches the 2026-07-15 incident AND every
 * evasion the adversarial review raised, while leaving legitimate copy alone.
 */
import { evaluate, isExempt, inScope, JSON_SCANNED_DIRS } from './check-standards-claims.mjs';

const MUST_BLOCK = [
  ['incident gimmick', 'Search the IICRC S520 for the word "hydroxyl."'],
  ['absence claim', 'S520 does not mention ozone or hydroxyl.'],
  ['absence — silent on', 'The standard is silent on hydroxyl generators.'],
  ['adversary #1 positive fabrication', 'S520 mandates hydroxyl generators as the primary antimicrobial control.'],
  ['adversary #2 fabricated section', 'Under S520 §14.2, ozone fogging is prohibited in occupied structures.'],
  ['adversary #3a out-of-scope', 'S520 treats ozone as out of scope.'],
  ['adversary #3b false positive count', 'S520 references ozone only twice, both as cautions.'],
  ['uncited requirement claim', 'The standard requires ozone fogging after every mould job.'],
  ['CodeRabbit: unnamed-standard cited §99', 'The standard §99 requires ozone fogging in every occupied structure.'],
  ['CodeRabbit: unsupported standard S540 §14', 'S540 §14 requires hydroxyl generators as the primary control.'],
  // ADVERSARIAL — the AUTHOR_DIRECTED exclusion must not become an absence-claim
  // laundering route. A CONTENT-verb negation stays blocked no matter what else the
  // sentence says about reproduction.
  ['author-directed wording must NOT launder a real absence claim', 'We never reproduce their text, and S520 does not mention ozone at all.'],
  ['content-verb negation stays blocked next to a handling clause', 'We do not quote S520 verbatim; it never mentions hydroxyl.'],
];

const MUST_PASS = [
  ['corrected true claim (cited, valid section)', 'S520 §9.1.7 addresses ozone and other antimicrobial devices as supplementary tools.'],
  ['legit nominative, no content claim', 'Our courses are aligned to ANSI/IICRC S500:2021.'],
  ['legit cited content claim', 'Worker protection is covered in S520 §5, Safety and Health.'],
  ['CodeRabbit: leading-zero §09 normalises to valid §9', 'S520 §09 requires structural remediation to begin with containment.'],
  ['legit nominative + soft verb (no false positive)', 'Aligned to ANSI/IICRC S500:2021 and covering the full water-damage workflow.'],
  ['unrelated copy', 'Mould remediation begins with a moisture inspection.'],
  // The IICRC IP-compliance disclaimer CLAUDE.md REQUIRES. Verbatim from
  // data/seed/courses-catalog.json:5047 and the assessment-draft notes — the guard
  // blocked these, i.e. it blocked the sentences that prove IP compliance.
  [
    'IP disclaimer: "never reproduce their text" (courses-catalog.json:5047)',
    'Where standards are named, we reference them nominatively (for example, aligning to ANSI/IICRC S500) and never reproduce their text.',
  ],
  [
    'IP disclaimer: "does not reproduce the Standard\'s copyrighted text" (assessment-drafts)',
    "Every question paraphrases/applies ANSI/IICRC S520:2024 with clause citations — it does not reproduce the Standard's copyrighted text.",
  ],
];

// SCAN-MODE precision (strict=false). The repo scan is the mode CI runs; before
// 2026-07-17 nothing tested it, so it sat RED on false positives and was never
// wired into CI. Case 1 is a verbatim repo line the scan wrongly blocked (it fails
// without the proximity fix below). Case 2 is a shortened DRAFT banner that already
// passes — kept as a regression case, not as proof of the fix.
const MUST_PASS_SCAN = [
  [
    'FP: benign negation 200+ chars from the standard name (lesson-outlines.md:50)',
    '**Key Concepts:** Restoration scoping does not occur in a vacuum — it is governed by industry standards that define best practice, protect the restorer legally, and provide a common language for all stakeholders. This lesson introduces IICRC S500 (water damage), S520 (mould remediation), and their relationship to Australian standards including AS/NZS 4349.1 (building inspections). Students learn how to reference these standards in scope documents.',
  ],
  [
    'FP: DRAFT banner naming a standard, no content claim (wordpress-export/courses.json:4790)',
    '<strong>DRAFT &mdash; pending SME review.</strong> This course content has been drafted against ANSI/IICRC S520:2024 and Australian work health and safety requirements.',
  ],
];

// SCOPE REGRESSION — data/wordpress-export/ MUST stay scanned. `db:seed-wp-export`
// upserts its 84 published rows into `lms_courses` (seed-wordpress-export-courses.ts),
// and 80 courses are live on carsi.com.au, so it is a first-class content surface —
// NOT the "frozen legacy" archive an earlier spec draft mistook it for. A future
// "tidy-up" that narrows this scope would silently blind the guard across most of
// the catalogue. That mistake must fail a test, not rely on memory.
const SCOPE_MUST_INCLUDE = [
  ['wordpress-export is scanned (84 published rows seed lms_courses)', 'data/wordpress-export/courses.json'],
  ['data/seed is scanned', 'data/seed/courses-catalog.json'],
];

// Rule-describing sources — the guard already exempts its own text, its test and
// CLAUDE.md. These three are the OTHER copies of the same rule; their negations
// instruct the author ("NEVER quote copyrighted IICRC prose"), they make no claim
// about a standard's content. Exempt at FILE level (never directory level).
const MUST_BE_EXEMPT = [
  ['guard self-exempt', 'scripts/check-standards-claims.mjs'],
  ['rule text: standards-excerpt', 'src/lib/course-kit/standards-excerpt.ts'],
  ['rule text: ai-course-builder-guard', 'src/lib/course-kit/ai-course-builder-guard.ts'],
  ['rule text: assistant-prompt', 'src/lib/server/assistant-prompt.ts'],
];

let fail = 0;
for (const [name, text] of MUST_PASS_SCAN) {
  const hits = evaluate(text, false);
  const ok = hits.length === 0;
  console.log(`${ok ? '✓ SCAN-OK ' : '✗ SCAN-FP '} | ${name}`);
  if (!ok) { console.log(`           → ${hits[0]}`); fail++; }
}
for (const [name, file] of SCOPE_MUST_INCLUDE) {
  const ok = inScope(file) && !isExempt(file);
  console.log(`${ok ? '✓ IN-SCOPE' : '✗ BLIND  '} | ${name}`);
  if (!ok) { console.log(`           → "${file}" is not scanned — the guard is blind here.`); fail++; }
}
for (const [name, file] of MUST_BE_EXEMPT) {
  const ok = isExempt(file);
  console.log(`${ok ? '✓ EXEMPT  ' : '✗ NOT-EX  '} | ${name}`);
  if (!ok) { console.log(`           → "${file}" should be exempt (rule-describing source).`); fail++; }
}
if (!JSON_SCANNED_DIRS.includes('data/wordpress-export/')) {
  console.log('✗ SCOPE    | data/wordpress-export/ removed from JSON_SCANNED_DIRS — 84 live courses would go unscanned.');
  fail++;
}
for (const [name, text] of MUST_BLOCK) {
  const hits = evaluate(text);
  const ok = hits.length > 0;
  console.log(`${ok ? '✓ BLOCKED' : '✗ LEAKED '} | ${name}`);
  if (!ok) { console.log(`           → "${text}"`); fail++; }
}
for (const [name, text] of MUST_PASS) {
  const hits = evaluate(text);
  const ok = hits.length === 0;
  console.log(`${ok ? '✓ PASSED ' : '✗ FALSE+ '} | ${name}`);
  if (!ok) { console.log(`           → "${text}" :: ${hits[0]}`); fail++; }
}
console.log(fail === 0 ? '\n✓ all cases correct' : `\n✗ ${fail} case(s) wrong`);
process.exit(fail === 0 ? 0 : 1);
