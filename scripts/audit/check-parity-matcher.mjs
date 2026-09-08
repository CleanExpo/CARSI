#!/usr/bin/env node
/**
 * GP-567 c10 — control for the parity matcher's false-NEGATIVE class.
 *
 * Origin: independent review of `6e92de9b` (cursor lane) found that dropping
 * tokens of length <= 3 deleted the level digits, after which
 * "level-1/2/3-mould-remediation" all normalised to the same bag of words and
 * inter/min(|A|,|B|) scored a strict subset as a perfect 1.0. Two distinct
 * courses were being reported as renames of a third.
 *
 * A false negative here HIDES a missing course, which is the direction that
 * fails quietly, so this control asserts the property rather than the count.
 *
 * Property: a token-overlap match may never join two courses whose numeric
 * tokens differ. "Level 2" is not a rename of "Level 1".
 *
 * Collisions (two legacy courses matched to one live course) are REPORTED, not
 * failed: `large-loss-mastery-super-course` and
 * `large-loss-mastery-course-split-payment` are plausibly genuine variants of one
 * live course. Silent collapse is the defect; a visible collision is a judgement
 * for a reviewer to make.
 */
import fs from 'node:fs';

const P = 'docs/audit/parity-analysis.json';
const fail = (m) => {
  console.error(`FAIL c10: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(P)) fail(`missing ${P}`);
const p = JSON.parse(fs.readFileSync(P, 'utf8'));
const matches = p.matched?.token_overlap ?? [];

// Tokenise the way the matcher does, then keep only PURELY numeric tokens.
// Extracting raw \d+ runs instead would pull digits out of hash suffixes
// ("...-2cc96b85" -> 2, 96, 85) and fail honest matches on noise.
const digits = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => /^\d+$/.test(t))
    .sort()
    .join(',');

// Property 1 — no match may cross a numeric boundary.
for (const m of matches) {
  const a = digits(m.legacy_slug);
  const b = digits(m.live_slug);
  if (a !== b) {
    fail(`token-overlap match crosses a numeric boundary: "${m.legacy_slug}" -> "${m.live_slug}" (${a || 'none'} vs ${b || 'none'})`);
  }
}

// Property 2 — the exact regression the reviewer found, pinned by name.
for (const n of [1, 2, 3]) {
  const legacy = `level-${n}-mould-remediation`;
  const m = matches.find((x) => x.legacy_slug === legacy);
  if (!m) continue; // matched by an earlier, higher-confidence matcher: fine
  if (!m.live_slug.startsWith(`level-${n}-mould-remediation`)) {
    fail(`${legacy} matched to "${m.live_slug}" — a Level-N course was absorbed by a different level`);
  }
}

// Property 3 — collisions are surfaced, never silent.
const byLive = matches.reduce((a, m) => ((a[m.live_slug] = a[m.live_slug] || []).push(m.legacy_slug), a), {});
const collisions = Object.entries(byLive).filter(([, v]) => v.length > 1);

console.log(`OK c10: ${matches.length} token-overlap matches, none crossing a numeric boundary; Level-1/2/3 each map to their own level`);
for (const [live, legacies] of collisions) {
  console.log(`  NOTE collision (reviewer judgement, not a failure): ${legacies.join(' + ')} -> ${live}`);
}
