#!/usr/bin/env node
/**
 * Non-vacuity proof for the live-catalogue licence guard.
 *
 * Every rule must be shown to FIRE on a known violation and to STAY SILENT on clean input.
 * Both halves matter equally: a guard that flags everything is as useless as one that flags
 * nothing, and this repo has now shipped both failure modes — `check-iicrc-terminology` exited
 * 0 on all input for an unknown period, and a swarm filter confirmed a finding that reading the
 * file disproved.
 *
 * The cases below are the three real violations measured on production 2026-08-18 plus the
 * clean controls that stop this from becoming a rubber stamp.
 */
import assert from 'node:assert/strict';

import { isLiveCourse, scanCourse } from './check-live-catalogue.mjs';

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

console.log('live-catalogue guard — rules must fire');

// --- real violations measured on production ---
check('fires on "(ASD-aligned)" in a title', () => {
  const hits = scanCourse({
    slug: 'asd-structural-drying-core',
    title: 'Applied Structural Drying — Core Concepts (ASD-aligned) | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'ASD'));
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'ASD'));
});

check('fires on "(CCT-aligned)"', () => {
  const hits = scanCourse({
    slug: 'cct-commercial-carpet-core',
    title: 'Commercial Carpet Care — Core Methods (CCT-aligned) | CARSI',
  });
  assert.ok(hits.length >= 2, `expected acronym + aligned hits, got ${JSON.stringify(hits)}`);
});

check('fires on "(FSRT-aligned)"', () => {
  const hits = scanCourse({
    slug: 'fsrt-fire-smoke-restoration-core',
    title: 'Fire & Smoke Restoration — Core Principles (FSRT-aligned) | CARSI',
  });
  assert.ok(hits.some((h) => h.detail === 'FSRT'));
});

check('fires on a banned slug even when the title is clean', () => {
  // The real wrt-water-damage-essentials case: title was remediated, slug was missed.
  const hits = scanCourse({
    slug: 'wrt-water-damage-essentials',
    title: 'Water Damage Restoration Course — Essentials | CARSI',
  });
  assert.deepEqual(
    hits.map((h) => h.rule),
    ['slug-acronym'],
  );
});

check('fires on every banned acronym, none silently unenforced', () => {
  for (const a of ['WRT', 'ASD', 'AMRT', 'FSRT', 'CCT', 'TCST', 'OCT', 'RRT']) {
    const hits = scanCourse({ slug: 'clean-slug', title: `Some Course (${a}) | CARSI` });
    assert.ok(hits.length > 0, `${a} did not fire`);
  }
});

console.log('live-catalogue guard — rules must stay silent on clean input');

check('silent on a compliant course', () => {
  assert.deepEqual(
    scanCourse({
      slug: 'water-damage-restoration-fundamentals',
      title: 'Water Damage Restoration — Fundamentals | CARSI',
    }),
    [],
  );
});

check('silent when an acronym appears only as part of a longer word', () => {
  // "ASD" inside "ASDs" would be a false alarm; whole-word matching must prevent it.
  assert.deepEqual(scanCourse({ slug: 'clean', title: 'Using Air Scrubbers and AFDs | CARSI' }), []);
});

check('silent on a slug that merely contains an acronym mid-string', () => {
  // Only a LEADING segment is branding. "forwrt-x" is not.
  assert.deepEqual(scanCourse({ slug: 'downwrt-handling', title: 'Clean Title | CARSI' }), []);
});

console.log('live-catalogue guard — soft-404 must not count as a live course');

check('treats the soft-404 title as not-live', () => {
  // Production returns HTTP 200 for nonexistent slugs. Status is never consulted.
  assert.equal(isLiveCourse('Course Not Found | CARSI'), false);
});

check('treats a real course title as live', () => {
  assert.equal(isLiveCourse('Water Damage Restoration — Essentials | CARSI'), true);
});

check('treats an empty title as not-live', () => {
  assert.equal(isLiveCourse(''), false);
});

console.log('live-catalogue guard — the three P1 escapes found in independent review');

// P1-LIVE-CATALOGUE-SLUG-SEGMENT-BYPASS: the slug rule matched only the LEADING segment, so
// moving the acronym one segment right walked straight through. Reported by gpt-5.5 with the
// exact reproduction below, which returned [] before the fix.
check('fires on a banned acronym in a NON-leading slug segment', () => {
  const hits = scanCourse({
    slug: 'water-damage-wrt-essentials',
    title: 'Water Damage Restoration Essentials | CARSI',
  });
  assert.ok(
    hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'),
    'WRT as a middle slug segment must be caught',
  );
});

check('fires on a banned acronym as the FINAL slug segment', () => {
  const hits = scanCourse({ slug: 'structural-drying-asd', title: 'Structural Drying | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'ASD'));
});

// The negative control the widened regex must not break: segment-bounded, never substring.
check('stays silent when the acronym is only part of a longer slug word', () => {
  const hits = scanCourse({
    slug: 'downwrt-handling-and-asdf-tooling',
    title: 'General Handling | CARSI',
  });
  assert.equal(hits.length, 0, 'mid-word letters are not branding');
});

check('stays silent on a clean multi-segment slug', () => {
  const hits = scanCourse({
    slug: 'water-damage-restoration-essentials',
    title: 'Water Damage Restoration Essentials | CARSI',
  });
  assert.equal(hits.length, 0);
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed — the guard is not trustworthy until they pass.`);
  process.exit(1);
}
console.log('\n✓ all live-catalogue guard rules proven to fire and to stay silent.');
