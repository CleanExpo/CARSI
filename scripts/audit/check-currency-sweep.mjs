#!/usr/bin/env node
/**
 * GP-567 c5 verifier — the currency sweep exists AND every count it publishes is
 * reproducible by re-running the scan, not merely present as prose.
 *
 * ── Why this checks all seven measures, not one ───────────────────────────
 *
 * Round-3 review planted a corrupted sweep — Total=1, 2025=99, unversioned=1 —
 * while leaving the 2021 row intact, and this script still exited 0. It compared
 * exactly one number. Every other figure in the table was unenforced decoration:
 * a reader would take the whole table as verified because the criterion was
 * green, when only one sixth of it had been checked.
 *
 * c5 requires that "every S500 citation in the repo corpus is flagged with the
 * edition asserted" AND that "the 2021-vs-2025 contamination count is
 * reproducible". So:
 *
 *   1. Every measure the sweep records is re-derived and compared. A corrupted
 *      row now fails whichever row it is.
 *   2. The four line classes must PARTITION the total. This is the structural
 *      half of "every citation flagged": if a citation is in none of the named
 *      classes, the arithmetic breaks and this fails. Checking counts alone
 *      cannot catch an unclassified citation — only the partition can, and its
 *      absence is exactly how 21 lines asserting another edition sat unrecorded
 *      while the sweep read as complete.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'docs/audit/currency-sweep.md';
const fail = (m) => {
  console.error(`FAIL c5: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const md = fs.readFileSync(FILE, 'utf8');

const recorded = (label) => {
  const m = md.match(new RegExp(`\\| ${label} \\| (\\d+) \\|`));
  return m ? Number(m[1]) : null;
};

let raw = '';
try {
  raw = execFileSync(
    'git',
    // Identical pathspec to build-sweeps.mjs. The audit's own files cite
    // S500:2021 to describe the problem; counting them would measure this
    // document rather than the catalogue.
    [
      '--no-pager', 'grep', '-nI', '-E', 'S500[^0-9]{0,3}(20[0-9]{2})?', '--',
      '*.ts', '*.tsx', '*.mjs', '*.js', '*.json', '*.md',
      ':(exclude)docs/audit/*', ':(exclude)scripts/audit/*', ':(exclude).claude/skills/course-truth/*',
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
} catch (e) {
  raw = e.stdout || '';
}
const lines = raw.split('\n').filter(Boolean);

const has = (re) => (l) => re.test(l);
const now2021 = lines.filter(has(/S500[^0-9]{0,3}2021/));
const now2025 = lines.filter(has(/S500[^0-9]{0,3}2025/));
const nowBare = lines.filter((l) => !/S500[^0-9]{0,3}20[0-9]{2}/.test(l));
const nowOther = lines.filter((l) => /S500[^0-9]{0,3}20[0-9]{2}/.test(l)
  && !/S500[^0-9]{0,3}2021/.test(l) && !/S500[^0-9]{0,3}2025/.test(l));
const distinct = (ls) => new Set(ls.map((l) => l.split(':')[0])).size;

// Every measure the sweep publishes, re-derived. The label is the exact table
// row text, so a row that is renamed or removed fails as "not recorded" rather
// than silently dropping out of the check.
const MEASURES = [
  ['Total S500 citation lines', lines.length],
  ['Distinct files citing S500', distinct(lines)],
  ['Lines asserting the \\*\\*2021\\*\\* edition', now2021.length],
  ['Files asserting the \\*\\*2021\\*\\* edition', distinct(now2021)],
  ['Lines asserting the \\*\\*2025\\*\\* edition', now2025.length],
  ['Lines citing S500 with \\*\\*no edition at all\\*\\*', nowBare.length],
  ['Lines asserting \\*\\*another edition\\*\\*[^|]*', nowOther.length],
];

const problems = [];
for (const [label, actual] of MEASURES) {
  const rec = recorded(label);
  const plain = label.replace(/\\\*\\\*/g, '').replace(/\[\^\|\]\*/g, '').trim();
  if (rec === null) {
    problems.push(`sweep does not record "${plain}" in a parseable table row`);
  } else if (rec !== actual) {
    problems.push(`sweep records ${rec} for "${plain}" but re-running the scan finds ${actual} — the recorded number is not reproducible`);
  }
}

// The partition, checked on BOTH sides — they catch different things, and only
// the first would have caught the defect that motivated this.
//
// RECORDED side: the published table must be internally consistent. This is the
// check that was missing. The table read 20 + 0 + 233 = 253 against a published
// total of 274, and nothing noticed for the life of the document, because no
// check ever added the rows up.
//
// DERIVED side: catches a line classified into two edition classes at once (a
// single line citing both S500:2021 and S500:2025 would be counted twice). This
// one is weaker by construction — both sides come from the same scan — so it is
// NOT the guarantee that every citation is classified. The recorded-side sum
// plus the per-measure recorded-vs-derived comparison above are what give that.
// The recorded sum is taken over EVERY line-class row the table actually
// contains — parsed from the document, not from a list this script keeps. That
// matters: a hardcoded list would make this check redundant (each row is already
// compared against the scan), and it would go quietly stale the moment a new
// edition class was added. Reading the table means a class row this verifier has
// never heard of still has to add up.
const recTotal = recorded('Total S500 citation lines');
const recParts = [...md.matchAll(/^\| (Lines [^|]*?) \| (\d+) \|/gm)]
  .map((m) => [m[1].replace(/\*\*/g, '').trim(), Number(m[2])]);
if (recTotal !== null && recParts.length) {
  const recSum = recParts.reduce((a, [, n]) => a + n, 0);
  if (recSum !== recTotal) {
    problems.push(
      'the recorded edition classes do not partition the recorded total: '
      + `${recParts.map(([k, n]) => `${k} (${n})`).join(' + ')} = ${recSum}, but the sweep records `
      + `${recTotal} total citation lines — ${Math.abs(recTotal - recSum)} citation(s) are published `
      + 'without any edition classification',
    );
  }
}

const partition = now2021.length + now2025.length + nowBare.length + nowOther.length;
if (partition !== lines.length) {
  problems.push(
    `the derived edition classes do not partition the corpus: 2021(${now2021.length}) + 2025(${now2025.length}) `
    + `+ unversioned(${nowBare.length}) + other(${nowOther.length}) = ${partition}, but the scan finds `
    + `${lines.length} citation lines — a citation is classified into two editions at once`,
  );
}

if (!/## Reproduce/.test(md)) problems.push('sweep does not publish the command needed to reproduce it');

if (problems.length) fail(`${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);

console.log(
  `OK c5: all ${MEASURES.length} recorded measures reproduce; edition classes partition the corpus `
  + `(${now2021.length} + ${now2025.length} + ${nowBare.length} + ${nowOther.length} = ${lines.length} lines)`,
);
