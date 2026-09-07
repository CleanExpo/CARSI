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
 *   2. The line classes must PARTITION the total. This is the structural
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

// ── ONE reader for the table, not two ────────────────────────────────────
//
// Round-5 (gemini lane) defeated this file by playing its two readers against
// each other. `recorded()` matched anywhere in the document while the partition
// scan was anchored to the start of a line, so prefixing a real class row with a
// single character satisfied the first reader and hid the row from the second —
// then a decoy row rebalanced the sum and the whole check went green over a
// table with a class row missing from its own partition.
//
// Two parsers over one grammar will always drift, and the drift IS the hole. So
// the table is now lexed exactly once, anchored at both ends, and every check
// below consumes those same rows. There is no second reading for an attacker to
// disagree with.
// Round-6: collapsing the two readers into one lexer was necessary and not
// sufficient. The lexer still scanned the WHOLE document and the lookup took the
// FIRST match, so a decoy row planted anywhere above `## Counts` shadowed the
// real one - the review corrupted the published table to 999 and this still
// exited 0. Scope was the half I left open: an unanchored SEARCH became an
// anchored search over an unbounded REGION, which is the same defect one level
// up. So the region is now bounded to the Counts section, and a label that
// matches more than one row inside it is ambiguity, refused rather than resolved
// by document order.
const CLASSES = ['total', 'edition-class', '—'];

// Round-7: bounding the region to the Counts section was right and still read
// markdown as if it were plain text. A FENCED CODE BLOCK containing a line that
// begins `## ` ended the region early, so the review planted a correct decoy
// table directly under `## Counts`, a fence holding `## NotARealHeading`, and
// left the real table — corrupted to 999 — outside the region entirely. c5
// exited 0 on a table it had never looked at. Reproduced here first.
//
// A fence body is not markdown structure, so it is masked out before anything
// structural is read: headings, the region slice and the row lexer all see the
// masked text. Lines are blanked rather than deleted so every `^…$` anchor and
// every offset still lines up with the document. This document legitimately
// carries a fence under `## Reproduce`, which is exactly why the check must
// understand fences rather than ban them.
const maskFences = (src) => {
  let fence = null;
  return src.split('\n').map((line) => {
    const m = /^\s{0,3}(```+|~~~+)/.exec(line);
    if (fence === null && m) {
      fence = m[1][0];
      return '';
    }
    if (fence !== null) {
      if (m && m[1][0] === fence) fence = null;
      return '';
    }
    return line;
  }).join('\n');
};
const structural = maskFences(md);

const headings = [...structural.matchAll(/^## Counts[ \t]*$/gm)];
if (headings.length !== 1) {
  fail(`the sweep declares ${headings.length} "## Counts" sections outside fenced code; exactly one is required, because the table to read must not depend on document order`);
}
const afterHeading = structural.slice(headings[0].index + headings[0][0].length);
const nextHeading = afterHeading.search(/^## /m);
const countsBlock = nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

const rows = [...countsBlock.matchAll(/^\| (.+?) \| (\d+) \| (.+?) \|[ \t]*$/gm)].map((m) => ({
  label: m[1].replace(/\*\*/g, '').trim(),
  count: Number(m[2]),
  cls: m[3].trim(),
}));

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
// Each label is matched WHOLE against a parsed row label, never searched for in
// the raw document. "another edition" carries a generated year list, so it keeps
// a trailing wildcard; the anchors are what matter.
// The fourth column is the class the row MUST declare. The partition sum polices
// every row's marker by arithmetic, but only while the row carries lines: a class
// row holding zero can be quietly unmarked and the sum still balances, so the
// marker on each known measure is pinned here as well. That gap was found by a
// mutant, not by argument — unmarking the 2025 row (count 0) passed a suite that
// caught the same mutation on every other row.
const MEASURES = [
  [/^Total S500 citation lines$/, 'Total S500 citation lines', lines.length, 'total'],
  [/^Distinct files citing S500$/, 'Distinct files citing S500', distinct(lines), '—'],
  [/^Lines asserting the 2021 edition$/, 'Lines asserting the 2021 edition', now2021.length, 'edition-class'],
  [/^Files asserting the 2021 edition$/, 'Files asserting the 2021 edition', distinct(now2021), '—'],
  [/^Lines asserting the 2025 edition$/, 'Lines asserting the 2025 edition', now2025.length, 'edition-class'],
  [/^Lines citing S500 with no edition at all$/, 'Lines citing S500 with no edition at all', nowBare.length, 'edition-class'],
  [/^Lines asserting another edition.*$/, 'Lines asserting another edition', nowOther.length, 'edition-class'],
];

const problems = [];

// Two rows carrying the same label make every lookup depend on which one comes
// first, which is exactly the property the review exploited. Refuse the document
// rather than pick a winner.
const seen = new Map();
for (const r of rows) seen.set(r.label, (seen.get(r.label) || 0) + 1);
for (const [label, n] of seen) {
  if (n > 1) problems.push(`the counts table carries ${n} rows labelled "${label}" — a duplicated label makes the reading depend on row order`);
}

for (const [labelRe, plain, actual, cls] of MEASURES) {
  const matching = rows.filter((r) => labelRe.test(r.label));
  if (matching.length > 1) {
    problems.push(`${matching.length} rows in the counts table match "${plain}" (${matching.map((r) => `"${r.label}"`).join(', ')}) — the measure must resolve to exactly one row`);
    continue;
  }
  const row = matching[0];
  if (!row) {
    problems.push(`sweep does not record "${plain}" in a parseable table row`);
    continue;
  }
  if (row.count !== actual) {
    problems.push(`sweep records ${row.count} for "${plain}" but re-running the scan finds ${actual} — the recorded number is not reproducible`);
  }
  if (row.cls !== cls) {
    problems.push(`sweep marks "${plain}" as class "${row.cls}", but it is a "${cls}" row — a mis-marked row is counted into, or out of, the partition`);
  }
}

// The class marker is itself a closed set. An unrecognised value is a row this
// verifier cannot classify, and an unclassifiable row is exactly what the
// partition is meant to make impossible — so refuse rather than skip it.
for (const r of rows) {
  if (!CLASSES.includes(r.cls)) {
    problems.push(`row "${r.label}" declares class "${r.cls}", which is not one of ${CLASSES.join(' | ')} — the verifier cannot tell whether it belongs in the partition`);
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
// Round-4 tried to select the partition rows by reading their labels: first any
// row beginning `| Lines `, then any label containing a year. Both are guesses
// about prose, and round-5 broke the second one from both sides at once — a row
// called "Lines of code in 2021" was dragged in, while a real class row could be
// pushed out. Whether a row is an edition class is not decidable from its name,
// so the generator now declares it and this reads the declaration.
//
// The marker is self-checking, which is why it is safe to trust: leave a genuine
// class row unmarked and the sum comes up short; mark a non-class row and it
// overshoots. Neither can pass. A new edition class added to build-sweeps.mjs is
// picked up with no change here.
const totalRows = rows.filter((r) => r.cls === 'total');
const recParts = rows.filter((r) => r.cls === 'edition-class');
if (totalRows.length !== 1) {
  problems.push(`the counts table declares ${totalRows.length} rows of class "total" — the partition needs exactly one`);
} else if (!recParts.length) {
  problems.push('the counts table declares no rows of class "edition-class" — nothing partitions the total');
} else {
  const recTotal = totalRows[0].count;
  const recSum = recParts.reduce((a, r) => a + r.count, 0);
  if (recSum !== recTotal) {
    problems.push(
      'the recorded edition classes do not partition the recorded total: '
      + `${recParts.map((r) => `${r.label} (${r.count})`).join(' + ')} = ${recSum}, but the sweep records `
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
