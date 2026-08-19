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

import {
  cannotAuditReport,
  DEFAULT_FETCH_TIMEOUT_MS,
  decodeEntities,
  fold,
  isLiveCourse,
  parseFetchTimeout,
  scanCourse,
  slugOf,
  titleOf,
} from './check-live-catalogue.mjs';

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

// P1 round 2 (gpt-5.5): the slug rule lowercased the acronym but tested the raw slug with no
// `i` flag, so an uppercase segment in a URL walked straight through.
check('fires on an UPPERCASE banned acronym slug segment', () => {
  const hits = scanCourse({
    slug: 'water-damage-WRT-essentials',
    title: 'Water Damage Restoration Essentials | CARSI',
  });
  assert.ok(
    hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'),
    'uppercase WRT in a slug segment must be caught',
  );
});

check('fires on a MixedCase banned acronym slug segment', () => {
  const hits = scanCourse({ slug: 'Asd-structural-drying', title: 'Structural Drying | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'ASD'));
});

check('case-insensitive slug matching still respects segment bounds', () => {
  const hits = scanCourse({ slug: 'downWRTx-handling', title: 'Handling | CARSI' });
  assert.equal(hits.length, 0, 'mid-word uppercase letters are not branding');
});

// P1 round 3 (gpt-5.5): a blanket case-SENSITIVE title rule let `wrt` and `WrT` through.
// Title matching is now case-insensitive for every acronym EXCEPT the ambiguous set, so the
// OCT/"oct" month collision stays protected without exposing everything else.
check('fires on a LOWERCASE designation in a title', () => {
  const hits = scanCourse({
    slug: 'water-damage-essentials',
    title: 'Water Damage wrt Essentials | CARSI',
  });
  assert.ok(
    hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'),
    'lowercase wrt in a title must be caught',
  );
});

check('fires on a MixedCase designation in a title', () => {
  const hits = scanCourse({
    slug: 'water-damage-essentials',
    title: 'Water Damage WrT Essentials | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

check('title rule does not fire on a lowercase month abbreviation', () => {
  const hits = scanCourse({ slug: 'seasonal-cleaning', title: 'Seasonal Cleaning oct 2026 | CARSI' });
  assert.equal(hits.length, 0, '"oct" in prose is not the OCT designation');
});

check('still fires on the OCT designation written as a designation', () => {
  const hits = scanCourse({ slug: 'odour-control', title: 'Odour Control OCT Programme | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'OCT'));
});

check('case-insensitive title matching still respects word bounds', () => {
  const hits = scanCourse({ slug: 'general-course', title: 'Wrtx Asdf Cctv Handling | CARSI' });
  assert.equal(hits.length, 0, 'letters inside longer words are not designations');
});

console.log('live-catalogue guard — plural and lookalike forms (round 4)');

// P1 round 4 (gpt-5.5): plural designation forms exited clean. A human writing a course title
// reaches for the plural without thinking; it is the same branding claim.
check('fires on a PLURAL designation in a title', () => {
  const hits = scanCourse({
    slug: 'water-damage-restoration',
    title: 'Water Damage WRTs Essentials | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

check('fires on a POSSESSIVE designation in a title', () => {
  const hits = scanCourse({ slug: 'clean-slug', title: "The WRT's Handbook | CARSI" });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

check('fires on a PLURAL designation slug segment', () => {
  const hits = scanCourse({ slug: 'wrts-water-damage', title: 'Water Damage Essentials | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'));
});

// P1 round 4: Greek capital rho U+03A1 stood in for R and read as clean.
check('fires on a Greek-lookalike designation (U+03A1 rho for R)', () => {
  const hits = scanCourse({ slug: 'clean', title: 'Water Damage W\u03A1T Essentials | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

check('fires on a Cyrillic-lookalike designation slug', () => {
  const hits = scanCourse({ slug: 'w\u0420t-water-damage', title: 'Water Damage | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'));
});

check('fires on a fullwidth designation, folded by NFKC', () => {
  const hits = scanCourse({ slug: 'clean', title: 'Water Damage \uFF37\uFF32\uFF34 Essentials | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

// Negative controls for the widened forms — these must NOT become false positives.
check('CCTV is not the CCT designation', () => {
  const hits = scanCourse({ slug: 'cctv-monitoring', title: 'CCTV Monitoring Basics | CARSI' });
  assert.equal(hits.length, 0, 'CCTV must not trip CCT');
});

check('the folded month abbreviation is still not the OCT designation', () => {
  const hits = scanCourse({ slug: 'seasonal', title: 'Seasonal Cleaning oct 2026 | CARSI' });
  assert.equal(hits.length, 0);
});

check('an ordinary plural word is not a designation', () => {
  const hits = scanCourse({ slug: 'carpets-and-rugs', title: 'Carpets and Rugs | CARSI' });
  assert.equal(hits.length, 0);
});

check('fold() leaves ordinary ASCII untouched', () => {
  assert.equal(fold('Water Damage Restoration'), 'Water Damage Restoration');
});

console.log('live-catalogue guard — round 5: false positive, possessive slug, small caps');

// P1 round 5 (gpt-5.5), FALSE POSITIVE — the worst class for a licence guard, because staff
// who see it cry wolf stop believing the guard at all. The ambiguous set was applied to titles
// only; a slug carries no case signal, so an ordinary October slug was reported as a breach.
check('does NOT fire on an ordinary October slug', () => {
  const hits = scanCourse({
    slug: 'seasonal-cleaning-oct-2026',
    title: 'Seasonal Cleaning oct 2026 | CARSI',
  });
  assert.equal(hits.length, 0, 'an October course is not the OCT designation');
});

check('does NOT fire on an October slug even with a clean unrelated title', () => {
  const hits = scanCourse({ slug: 'oct-2026-intake', title: 'Intake | CARSI' });
  assert.equal(hits.length, 0);
});

// The documented cost of that decision: OCT is unreachable via slug. The title rule and the
// compliance backstop still cover it, and this test pins the trade-off so it cannot drift
// silently into "we forgot".
check('OCT is still caught in a TITLE, which is where case disambiguates it', () => {
  const hits = scanCourse({ slug: 'odour-control-programme', title: 'Odour Control OCT | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'OCT'));
});

// P1 round 5: the slug regex accepted `s?` while the commit claimed `s` / `'s`.
check('fires on a POSSESSIVE designation slug', () => {
  const hits = scanCourse({ slug: "wrt's-water-damage", title: 'Water Damage Essentials | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'));
});

// P1 round 5: U+1D21 small-capital W is not folded by NFKC. Mapped as a BLOCK, because
// enumerating single codepoints as each is reported is an infinite ratchet.
check('fires on a small-capital lookalike (U+1D21 W)', () => {
  const hits = scanCourse({ slug: 'clean', title: 'Water Damage \u1D21RT Essentials | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

check('fires on a small-capital lookalike in another acronym (U+1D00 A)', () => {
  const hits = scanCourse({ slug: 'clean', title: 'Structural Drying \u1D00SD Core | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'ASD'));
});

// fold() must not corrupt the Australian metric and electrical text CARSI course copy is
// required to carry. Digit mappings (0->O, 5->S) did exactly that — `50 m² @ 230 V` folded to
// `SO m2 @ 23O V` — and also opened a false-positive path where `0ct` becomes `OCT`.
// NFKC still folds the superscript, which is harmless: matching is ASCII-only and the ORIGINAL
// title is what gets reported.
check('fold does not corrupt Australian metric or electrical text', () => {
  assert.equal(fold('Odour, Colour & Mould — 50 m² @ 230 V'), 'Odour, Colour & Mould — 50 m2 @ 230 V');
});

check('a digit is never treated as a designation letter', () => {
  const hits = scanCourse({ slug: '0ct-2026-intake', title: 'Intake 0CT 2026 | CARSI' });
  assert.equal(hits.length, 0, 'digits must not fold into OCT');
});

console.log('live-catalogue guard — round 6: "-aligned" must mean DESIGNATION-aligned');

// P1 round 6 (gpt-5.5), FALSE POSITIVE. A bare /-aligned/ flagged `AS/NZS-aligned …`. That is
// not merely legitimate wording — CLAUDE.md REQUIRES AS/NZS framing on Australian course
// content, so the guard was flagging the house style it exists to protect. Nominative
// standards references are correct usage; only IICRC discipline designations are branding.
check('does NOT fire on AS/NZS-aligned, which CARSI course copy is required to use', () => {
  const hits = scanCourse({
    slug: 'as-nzs-electrical-safety',
    title: 'AS/NZS-aligned Electrical Safety for Restoration Technicians — 230 V / 50 Hz / 10 A | CARSI',
  });
  assert.equal(hits.length, 0, 'AS/NZS framing is mandated, not banned');
});

check('does NOT fire on ANSI-aligned', () => {
  assert.equal(scanCourse({ slug: 'c', title: 'ANSI-aligned Drying Practice | CARSI' }).length, 0);
});

check('does NOT fire on ISO-aligned', () => {
  assert.equal(scanCourse({ slug: 'c', title: 'ISO-aligned Quality Systems | CARSI' }).length, 0);
});

check('still fires on a DESIGNATION-aligned title', () => {
  const hits = scanCourse({
    slug: 'structural-drying',
    title: 'Applied Structural Drying — Core Concepts (ASD-aligned) | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
});

check('still fires on IICRC-aligned', () => {
  const hits = scanCourse({ slug: 'general', title: 'IICRC-aligned Restoration Course | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
});

check('fires on a space-separated designation-aligned form', () => {
  const hits = scanCourse({ slug: 'general', title: 'WRT aligned Water Damage | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
});

check('the reported detail names the matched phrase, not a generic label', () => {
  const hits = scanCourse({ slug: 'c', title: 'Course (FSRT-aligned) | CARSI' });
  const aligned = hits.find((h) => h.rule === 'title-aligned');
  assert.match(aligned.detail, /FSRT-aligned/i, 'an operator must see what actually matched');
});

console.log('live-catalogue guard — round 7: benign industry phrase, and the CEC-aligned escape');

// P1 round 7 (gpt-5.5), FALSE POSITIVE. RRT is the IICRC Carpet Repair and Reinstallation
// Technician designation, but "Rapid Response Team (RRT)" is ordinary Australian storm-response
// wording. Case cannot separate them, so the phrase is whitelisted explicitly.
check('does NOT fire on "Rapid Response Team (RRT)" in a title', () => {
  const hits = scanCourse({
    slug: 'rapid-response-team-mobilisation',
    title: 'Rapid Response Team (RRT) Mobilisation for Storm Damage | CARSI',
  });
  assert.equal(hits.length, 0, 'a rapid response team is not the IICRC designation');
});

check('does NOT fire on the same phrase in a slug', () => {
  const hits = scanCourse({
    slug: 'rapid-response-team-rrt-mobilisation',
    title: 'Rapid Response Team Mobilisation for Storm Damage | CARSI',
  });
  assert.equal(hits.length, 0);
});

// The whitelist masks the benign PHRASE and the acronym annotating it — never the acronym across
// the whole course. The earlier `hasBenignExpansion() -> continue` skipped both surfaces
// entirely, so a whitelisted phrase silenced a genuine brand use of the SAME acronym later in
// the same title. Independent review raised it on PR #674 and it reproduced: the first case
// below returned [] before this fix. Both directions are pinned, because a mask that is too
// greedy re-creates the false positive the whitelist exists to prevent.
check('benign expansion does NOT grant the rest of the title an exemption', () => {
  const rrt = scanCourse({
    slug: 'rapid-response-team-rrt',
    title: 'Rapid Response Team (RRT) and Restoration RRT Certification | CARSI',
  });
  assert.ok(
    rrt.some((h) => h.rule === 'title-acronym' && h.detail === 'RRT'),
    'a second, unattached RRT is branding and must fire even though the benign phrase is present',
  );

  const cct = scanCourse({
    slug: 'inspection-lighting',
    title: 'Correlated Colour Temperature (CCT) and Carpet Cleaning CCT Course | CARSI',
  });
  assert.ok(
    cct.some((h) => h.rule === 'title-acronym' && h.detail === 'CCT'),
    'the lighting measure does not license a bare CCT brand elsewhere in the title',
  );

  // …and the mask must still suppress what it was written for, both spellings.
  for (const title of [
    'Inspection Lighting — Correlated Colour Temperature (CCT) | CARSI',
    'Inspection Lighting — Correlated Color Temperature (CCT) | CARSI',
  ]) {
    assert.equal(
      scanCourse({ slug: 'inspection-lighting', title }).length,
      0,
      `benign expansion alone must stay clean: ${title}`,
    );
  }
});

// A designation is the designation however its author punctuated it. Independent review of
// PR #674 found `Water Damage Restoration-Technician` returned clean while the identical spaced
// form fired. Separators between two letters are normalised to spaces; ordinary hyphenated words
// must stay untouched, so both directions are pinned.
check('a hyphen or underscore does not defeat a designation phrase', () => {
  for (const title of [
    'Water Damage Restoration-Technician Course | CARSI',
    'Applied Structural Drying_Technician | CARSI',
    'Carpet Cleaning-Technician Essentials | CARSI',
  ]) {
    assert.ok(
      scanCourse({ slug: 'clean-slug', title }).some((h) => h.rule === 'designation-phrase'),
      `punctuated designation must still fire: ${title}`,
    );
  }
  assert.equal(
    scanCourse({
      slug: 'clean-slug',
      title: 'Two-Stage Pre-Cleaning for Hard-Surface Floors | CARSI',
    }).length,
    0,
    'ordinary hyphenated words are not designations',
  );
});

// Review round 3, both directions of the benign-expansion boundary.
check('a benign title does not licence a designation-carrying slug', () => {
  // `cct-lighting` under a Correlated Colour Temperature title is one legitimate course, but a
  // slug carrying the designation's OWN domain words is branding, whatever the title says.
  assert.ok(
    scanCourse({ slug: 'cct-carpet-cleaning', title: 'Correlated Colour Temperature | CARSI' })
      .some((h) => h.rule === 'slug-acronym'),
    'cct + carpet/cleaning in the slug is the designation, not the lighting measure',
  );
  assert.equal(
    scanCourse({
      slug: 'cct-lighting',
      title: 'Correlated Colour Temperature (CCT) for Restoration Inspection Lighting | CARSI',
    }).length,
    0,
    'a slug abbreviating the benign topic stays clean',
  );
});

check('an acronym BEFORE its benign phrase is not a violation', () => {
  // Masking only a trailing acronym made these false positives — the annotation is the same
  // claim whichever side of the phrase it sits on.
  for (const title of [
    'RRT Rapid Response Team Mobilisation | CARSI',
    'CCT Correlated Colour Temperature | CARSI',
    '(CCT) Correlated Colour Temperature for Inspection Lighting | CARSI',
  ]) {
    assert.equal(
      scanCourse({ slug: 'clean-slug', title }).length,
      0,
      `leading acronym annotating a benign phrase must stay clean: ${title}`,
    );
  }
});

// The whitelist is a PHRASE, not a general "acronym defined by preceding words" rule — that
// generalisation would suppress a spelled-out designation, which is banned as course branding.
check('still fires on bare RRT with no benign phrase present', () => {
  const hits = scanCourse({ slug: 'rrt-carpet-repair', title: 'Carpet Repair RRT Course | CARSI' });
  assert.ok(hits.some((h) => h.detail === 'RRT'));
});

check('still fires on a SPELLED-OUT designation, which the whitelist must not cover', () => {
  const hits = scanCourse({
    slug: 'water-restoration-technician-wrt',
    title: 'Water Restoration Technician (WRT) | CARSI',
  });
  assert.ok(hits.some((h) => h.detail === 'WRT'), 'the designation spelled out is still branding');
});

// P1 round 7, ESCAPE: the aligned rule required the designation immediately before "aligned".
check('fires on IICRC CEC-aligned', () => {
  const hits = scanCourse({ slug: 'c', title: 'IICRC CEC-aligned Restoration Course | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
});

check('fires on IICRC CEC aligned (spaced)', () => {
  const hits = scanCourse({ slug: 'c', title: 'IICRC CEC aligned Restoration Course | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'title-aligned'));
});

// The intervening-token allowance is bounded at two SPECIFICALLY so the phrasing CLAUDE.md
// REQUIRES does not become a violation. This is the control that stops the fix over-reaching.
check('does NOT fire on the required "IICRC CEC Accredited … AS/NZS aligned" phrasing', () => {
  const hits = scanCourse({
    slug: 'drying-course',
    title: 'IICRC CEC Accredited courses, AS/NZS aligned | CARSI',
  });
  assert.equal(hits.length, 0, 'the mandated phrasing must never be flagged');
});

// The control above is WEAK on its own: it stays silent partly because the comma breaks the
// token run. A mutation run proved it — widening the gap to six tokens survived. This
// comma-free sentence is the real control, and it is copy CARSI could plausibly publish.
check('does NOT fire when a standards reference sits several words after IICRC', () => {
  const hits = scanCourse({
    slug: 'drying-course',
    title: 'IICRC CEC Accredited course content is ANSI aligned | CARSI',
  });
  assert.equal(hits.length, 0, 'a distant standards reference is not designation branding');
});

console.log('live-catalogue guard — round 8: designation NAMES, and the CCT lighting collision');

// P1 round 8 (gpt-5.5), THE BIGGEST ESCAPE FOUND. Every rule keyed on the ACRONYM, so the
// designation spelled out with no acronym anywhere passed clean through eight rounds. That is
// the plainest form of the thing CLAUDE.md bans.
check('fires on a designation NAME with no acronym present', () => {
  const hits = scanCourse({
    slug: 'water-restoration-technician-course',
    title: 'Water Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('fires on the full WRT designation name', () => {
  const hits = scanCourse({ slug: 'wd', title: 'Water Damage Restoration Technician Programme | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('fires on "Odour Control Technician" spelled out', () => {
  const hits = scanCourse({ slug: 'o', title: 'Odour Control Technician Training | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('fires on a designation name in the SLUG', () => {
  const hits = scanCourse({ slug: 'carpet-cleaning-technician-course', title: 'Clean | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// The controls that stop this rule swallowing ordinary subject matter. CARSI must remain free
// to teach and NAME its topics; only the IICRC designations are branding.
check('does NOT fire on "Water Damage Restoration" as a topic', () => {
  const hits = scanCourse({ slug: 'water-damage-restoration', title: 'Water Damage Restoration | CARSI' });
  assert.equal(hits.length, 0, 'the topic is not the designation');
});

check('does NOT fire on "Structural Drying Fundamentals"', () => {
  const hits = scanCourse({ slug: 'structural-drying-fundamentals', title: 'Structural Drying Fundamentals | CARSI' });
  assert.equal(hits.length, 0);
});

check("does NOT fire on CARSI's OWN designation", () => {
  const hits = scanCourse({
    slug: 'carsi-water-restoration-practitioner',
    title: 'CARSI Water Restoration Practitioner | CARSI',
  });
  assert.equal(hits.length, 0, 'CARSI Practitioner designations are the whole point');
});

check('does NOT fire on "Odour Control Methods"', () => {
  const hits = scanCourse({ slug: 'odour-control-methods', title: 'Odour Control Methods for Fire Damage | CARSI' });
  assert.equal(hits.length, 0);
});

// P1 round 8, FALSE POSITIVE: CCT is also Correlated Colour Temperature, the lighting measure
// used when specifying inspection lamps — genuine restoration subject matter.
check('does NOT fire on Correlated Colour Temperature (CCT)', () => {
  const hits = scanCourse({
    slug: 'correlated-colour-temperature-cct-inspection-lighting',
    title: 'Correlated Colour Temperature (CCT) for Restoration Inspection Lighting | CARSI',
  });
  assert.equal(hits.length, 0, 'a lighting measure is not the Carpet Cleaning Technician designation');
});

check('still fires on bare CCT with no lighting context', () => {
  const hits = scanCourse({ slug: 'cct-commercial-carpet', title: 'Commercial Carpet Care CCT | CARSI' });
  assert.ok(hits.some((h) => h.detail === 'CCT'));
});

console.log('live-catalogue guard — round 9: audience usage, and a designation name I got wrong');

// P1 round 9 (gpt-5.5): the TCST expansion in this map was GUESSED from memory with no
// licensed source — "tile stone and concrete cleaning technician" — and was wrong. TCST is
// Trauma and Crime Scene Technician. Both are kept: the wrong one costs nothing, and removing
// it silently would hide that the map was once fabricated.
check('fires on the TCST designation spelled out', () => {
  const hits = scanCourse({
    slug: 'trauma-and-crime-scene-technician-course',
    title: 'Trauma and Crime Scene Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// P1 round 9, FALSE POSITIVE: substring matching blocked audience wording. A course teaching
// PPE *to* technicians is not a course branded as the designation.
check('does NOT fire on plural audience wording', () => {
  const hits = scanCourse({
    slug: 'ppe-for-water-damage-restoration-technicians',
    title: 'PPE for Water Damage Restoration Technicians | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'), 'reported as an audience note');
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'), 'but it must not block');
});

// REVERSED at round 10. Plural was treated as an audience signal; independent review showed
// that made it an escape hatch — `Water Damage Restoration Technicians Course` passed clean, so
// any branded title escaped by adding one letter. A designation stays a designation in the
// plural. Only a real SUBJECT followed by "for" now counts as audience.
check('FIRES on a plural designation title (plural is not an escape)', () => {
  const hits = scanCourse({
    slug: 'water-damage-restoration-technicians-handbook',
    title: 'Water Damage Restoration Technicians Handbook | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'), 'plural must not suppress');
});

check('does NOT fire on singular audience wording with an article', () => {
  const hits = scanCourse({
    slug: 'ppe-for-the-water-damage-restoration-technician',
    title: 'PPE for the Water Damage Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'));
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'));
});

// The line the audience rule must not cross: branding is the singular, unprefixed designation.
check('still fires when the designation IS the course name', () => {
  const hits = scanCourse({
    slug: 'water-restoration-technician-course',
    title: 'Water Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('still fires on the designation as a programme name', () => {
  const hits = scanCourse({ slug: 'wd', title: 'Water Damage Restoration Technician Programme | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

console.log('live-catalogue guard — round 10: the audience heuristic was an escape hatch');

// P1 round 10 (gpt-5.5), THREE escapes, all created by my own round-9 false-positive fix.
// Fixing a false positive by loosening a rule is how a guard quietly stops guarding.
check('FIRES on a plural designation used as the course name', () => {
  const hits = scanCourse({
    slug: 'water-damage-restoration-technicians-course',
    title: 'Water Damage Restoration Technicians Course | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('FIRES on "Course for <designation>" — a course noun is not an audience', () => {
  const hits = scanCourse({
    slug: 'course-for-water-damage-restoration-technician',
    title: 'Course for Water Damage Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'), 'the course IS being named by it');
});

check('FIRES on the ampersand spelling of a designation', () => {
  const hits = scanCourse({
    slug: 'trauma-crime-scene-technician-course',
    title: 'Trauma & Crime Scene Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('FIRES on the ampersand spelling of FSRT', () => {
  const hits = scanCourse({ slug: 'f', title: 'Fire & Smoke Restoration Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// The remaining audience form: a REAL subject before "for". This is the only survivor of the
// heuristic, and it must keep working or legitimate training content gets blocked.
check('reports "PPE for … Technicians" as an audience NOTE, and does not block', () => {
  const hits = scanCourse({
    slug: 'ppe-for-water-damage-restoration-technicians',
    title: 'PPE for Water Damage Restoration Technicians | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'), 'never silently dropped');
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'), 'audience must not block');
});

check('reports "Respiratory Protection for the … Technician" as a note', () => {
  const hits = scanCourse({
    slug: 'respiratory-protection-for-the-water-damage-restoration-technician',
    title: 'Respiratory Protection for the Water Damage Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'));
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'));
});

// Two mutants SURVIVED a mutation run at this point, meaning nothing exercised these paths.
// Both are added here rather than left as "probably fine".

// "for" with NOTHING before it is not audience — there is no subject being taught.
check('FIRES when the title opens with "For <designation>"', () => {
  const hits = scanCourse({
    slug: 'for-water-damage-restoration-technicians',
    title: 'For Water Damage Restoration Technicians | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'), 'no subject means no audience');
});

// The and-less SLUG form was only ever covered by tests whose TITLE also matched, so the slug
// path itself was never exercised. Clean title, branded slug.
check('FIRES on an and-less designation SLUG with a clean title', () => {
  const hits = scanCourse({
    slug: 'trauma-crime-scene-technician-course',
    title: 'Restoration Basics | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'), 'slug branding must be caught alone');
});

console.log('live-catalogue guard — round 11: classification reports, it never suppresses');

// P1 round 11 (gpt-5.5), THREE findings, one cause: a hand-written English word list decided
// what to SUPPRESS. Missing course nouns hid real violations; missing modifiers raised false
// ones. The architecture changed so classification can no longer hide anything.
check('a course noun the list did not have still BLOCKS (Webinar)', () => {
  const hits = scanCourse({ slug: 'clean-slug', title: 'Webinar for Water Damage Restoration Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('Seminar for <designation> blocks', () => {
  const hits = scanCourse({ slug: 'clean-slug', title: 'Seminar for Water Damage Restoration Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// A slash is as plausible a staff separator as an ampersand.
check('FIRES on a slash-separated designation (FSRT)', () => {
  const hits = scanCourse({ slug: 'clean-slug', title: 'Fire/Smoke Restoration Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

check('FIRES on a slash-separated designation (TCST)', () => {
  const hits = scanCourse({ slug: 'clean-slug', title: 'Trauma/Crime Scene Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// Modifiers after "for" are adjectives, not evidence of branding. A closed article list read
// these as violations.
check('"for Every <designation>" is a note, not a violation', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'Communication Skills for Every Water Damage Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'));
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'));
});

check('"for New <designation>" is a note, not a violation', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'Induction for New Water Damage Restoration Technician | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'));
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'));
});

// THE ARCHITECTURAL INVARIANT. This is the test that makes the ratchet impossible: whatever the
// word lists say, a designation phrase present in the copy is ALWAYS reported as something.
// A missing word can downgrade a violation to a note; it can never produce silence.
check('a designation phrase is never silently dropped, whatever the lists say', () => {
  const titles = [
    'Water Damage Restoration Technician | CARSI',
    'Webinar for Water Damage Restoration Technician | CARSI',
    'PPE for Water Damage Restoration Technicians | CARSI',
    'Communication Skills for Every Water Damage Restoration Technician | CARSI',
    'Zorbing for the Water Damage Restoration Technician | CARSI',
  ];
  for (const title of titles) {
    const hits = scanCourse({ slug: 'clean-slug', title });
    assert.ok(
      hits.some((h) => h.rule === 'designation-phrase' || h.rule === 'designation-phrase-audience'),
      `silently dropped: ${title}`,
    );
  }
});

console.log('live-catalogue guard — round 12: the P0, and the subject test');

// P0 round 12 (gpt-5.5). The never-silent invariant I asserted last round was FALSE. A benign
// acronym expansion skipped the WHOLE acronym, including its spelled-out designation, so
// `Correlated Colour Temperature (CCT) for Carpet Cleaning Technician` reported nothing at all.
// The whitelist exists because an ACRONYM's letters collide with an industry term; a
// spelled-out designation has no such collision and must never be suppressed by it.
check('P0: a benign expansion cannot hide a spelled-out designation (CCT)', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'Correlated Colour Temperature (CCT) for Carpet Cleaning Technician | CARSI',
  });
  assert.ok(hits.length > 0, 'the designation phrase must still be reported');
});

check('P0: a benign expansion cannot hide a spelled-out designation (RRT)', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'Rapid Response Team (RRT) for Carpet Repair and Reinstallation Technician | CARSI',
  });
  assert.ok(hits.length > 0);
});

// …while still suppressing the bare ACRONYM, which is what the whitelist is for.
check('the benign expansion still silences the bare acronym', () => {
  const hits = scanCourse({
    slug: 'cct-lighting',
    title: 'Correlated Colour Temperature (CCT) for Restoration Inspection Lighting | CARSI',
  });
  assert.equal(hits.length, 0);
});

// P1 round 12: the subject test matched any subject ENDING in a course noun, so real subjects
// that happen to end in one were read as branding.
check('"PPE Training for … Technicians" is a note, not a violation', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'PPE Training for Water Damage Restoration Technicians | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase-audience'));
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'), 'a real subject is not branding');
});

check('"Respiratory Protection Module for the … Technician" is a note', () => {
  const hits = scanCourse({
    slug: 'clean-slug',
    title: 'Respiratory Protection Module for the Water Damage Restoration Technician | CARSI',
  });
  assert.ok(!hits.some((h) => h.rule === 'designation-phrase'));
});

// The line that must hold: a course noun as the WHOLE subject is still branding.
check('a bare course noun as the whole subject still blocks', () => {
  const hits = scanCourse({ slug: 'c', title: 'Webinar for Water Damage Restoration Technician | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'designation-phrase'));
});

// --- end-to-end: exit codes against a fixture site -------------------------------------
//
// The checks above are pure. They cannot see fetchText() rejecting a non-2xx page, nor the
// coverage accounting that refuses to exit 0 on an unaudited URL — both are network behaviour.
// A mutation run proved the gap was real: deleting `if (!res.ok) throw` left every check above
// passing. These cases run the real script against a local fixture server and assert its exit
// code, so those two fixes cannot be removed silently.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = fileURLToPath(new URL('./check-live-catalogue.mjs', import.meta.url));

function serve(pages) {
  // pages: { '/courses/x': [status, html] }; the sitemap is generated from its keys.
  const server = http.createServer((req, res) => {
    const path = req.url.split('?')[0];
    const port = server.address().port;
    if (path === '/sitemap.xml') {
      const urls = Object.keys(pages)
        .map((p) => `<url><loc>http://127.0.0.1:${port}${p}</loc></url>`)
        .join('');
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(`<?xml version="1.0"?><urlset>${urls}</urlset>`);
      return;
    }
    const hit = pages[path];
    if (!hit) {
      res.writeHead(404);
      res.end('nope');
      return;
    }
    res.writeHead(hit[0], { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(hit[1]);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function runGuard(port, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [GUARD, ...args], {
      env: { ...process.env, CARSI_SITE: `http://127.0.0.1:${port}` },
    });
    // stdout and stderr kept separate: a --json consumer reads stdout alone, so a human line
    // leaking onto stdout is a real defect and must be visible to the assertion.
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ code, out, err, combined: out + err }));
  });
}

async function checkE2E(name, pages, assertFn) {
  const server = await serve(pages);
  try {
    const result = await runGuard(server.address().port);
    assertFn(result);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  } finally {
    server.close();
  }
}

const title = (t) => `<html><head><title>${t}</title></head><body>x</body></html>`;

console.log('live-catalogue guard — end-to-end exit codes');

await checkE2E(
  'exits 2 (not 0) when a course page returns HTTP 500',
  { '/courses/server-error-course': [500, title('Server Error | CARSI')] },
  ({ code }) => assert.equal(code, 2, 'a 500 page must never count as a clean live course'),
);

await checkE2E(
  'exits 2 (not 0) when a course page returns 200 with no <title>',
  {
    '/courses/clean-course': [200, title('Clean Course | CARSI')],
    '/courses/untitled-course': [200, '<html><head></head><body>no title</body></html>'],
  },
  ({ code, combined }) => {
    assert.equal(code, 2, 'an unaudited URL must not be dropped silently');
    assert.match(combined, /unaudited/, 'the unaudited URL must be named');
  },
);

await checkE2E(
  'exits 1 on a banned slug hiding behind a missing title',
  { '/courses/wrt-hidden': [200, '<html><head></head><body>no title</body></html>'] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'slug rules must run even when the title is unusable');
    assert.match(combined, /slug-acronym/);
  },
);

await checkE2E(
  'exits 0 on a genuinely clean fixture site',
  { '/courses/water-damage-restoration': [200, title('Water Damage Restoration | CARSI')] },
  ({ code }) => assert.equal(code, 0, 'a clean site must still pass, or the guard is a rubber stamp'),
);

async function checkJson(name, pages, assertFn) {
  const server = await serve(pages);
  try {
    const { code, out } = await runGuard(server.address().port, ['--json']);
    assertFn(JSON.parse(out), code, out);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  } finally {
    server.close();
  }
}

console.log('live-catalogue guard — --json must be machine-readable');

// P1 round 12: a trailing "✓ N live courses clean." was printed after the JSON object, so
// JSON.parse failed on every clean or note-only audit. A machine-readable flag that emits
// unparseable output is worse than no flag.
await checkJson(
  '--json is parseable on a CLEAN site',
  { '/courses/water-damage-restoration': [200, title('Water Damage Restoration | CARSI')] },
  (parsed, code) => {
    assert.equal(code, 0);
    assert.equal(parsed.violations.length, 0);
  },
);

await checkJson(
  '--json is parseable on a NOTE-ONLY site, and does not block',
  {
    '/courses/ppe-for-water-damage-restoration-technicians': [
      200,
      title('PPE for Water Damage Restoration Technicians | CARSI'),
    ],
  },
  (parsed, code) => {
    assert.equal(code, 0, 'audience notes must not block');
    assert.equal(parsed.violations.length, 0);
    assert.equal(parsed.notes.length, 1, 'the note must still be reported');
  },
);

await checkJson(
  '--json is parseable on a VIOLATION site',
  { '/courses/water-restoration-technician': [200, title('Water Restoration Technician | CARSI')] },
  (parsed, code) => {
    assert.equal(code, 1);
    assert.equal(parsed.violations.length, 1);
  },
);

// P1 round 13 (gpt-5.5): the three JSON tests above cover clean, note-only and violation, but
// NOT the cannot-audit exits. Those wrote human text to stderr and left stdout EMPTY, so a
// consumer got a parse error rather than a machine-readable reason. "I could not look" is
// precisely the outcome a consumer most needs to tell apart from "nothing is wrong".

async function checkJsonExit2(name, site, assertFn) {
  const { code, out } = await new Promise((resolve) => {
    const child = spawn(process.execPath, [GUARD, '--json'], {
      env: { ...process.env, CARSI_SITE: site },
    });
    let o2 = '';
    child.stdout.on('data', (d) => (o2 += d));
    child.on('close', (c) => resolve({ code: c, out: o2 }));
  });
  try {
    assertFn(JSON.parse(out), code);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}\n      stdout: ${JSON.stringify(out.slice(0, 120))}`);
  }
}

console.log('live-catalogue guard — --json must be parseable on the FAILURE paths too');

await checkJsonExit2(
  '--json is parseable when the site is unreachable',
  'http://127.0.0.1:9',
  (parsed, code) => {
    assert.equal(code, 2, 'unreachable must not be exit 0');
    assert.ok(parsed.error, 'the reason must be machine-readable');
    assert.equal(parsed.checked, 0);
    assert.deepEqual(parsed.violations, []);
  },
);

await (async () => {
  // A sitemap that lists no course URLs at all.
  const server = await serve({ '/courses/unused': [200, title('unused | CARSI')] });
  const port = server.address().port;
  server.close();
  const empty = await serve({});
  try {
    await checkJsonExit2(
      '--json is parseable when the sitemap lists no course URLs',
      `http://127.0.0.1:${empty.address().port}`,
      (parsed, code) => {
        assert.equal(code, 2);
        assert.ok(parsed.error);
        assert.equal(parsed.checked, 0);
      },
    );
  } finally {
    empty.close();
    void port;
  }
})();

// P1 round 14 (gpt-5.5): the round-13 fix traded one unparseable path for another. On the
// no-usable-title path the main JSON block had ALREADY printed, so cannotAudit() emitted a
// SECOND object and stdout carried two adjacent documents. The error is now a FIELD of the one
// report. This test walks EVERY exit path rather than the three it started with — the gap that
// let round 13 and round 14 both ship an unparseable --json.

const NOTITLE = '<html><head></head><body>no title</body></html>';

async function jsonPath(name, pages, expectCode, expectError) {
  const server = await serve(pages);
  try {
    const { code, out } = await runGuard(server.address().port, ['--json']);
    const parsed = JSON.parse(out); // throws if stdout is empty or holds two documents
    assert.equal(code, expectCode, `exit code for ${name}`);
    if (expectError) assert.ok(parsed.error, 'exit 2 must carry a machine-readable reason');
    else assert.ok(!parsed.error, 'a successful audit carries no error');
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  } finally {
    server.close();
  }
}

console.log('live-catalogue guard — one parseable JSON object on EVERY exit path');

await jsonPath('exit 0, clean', { '/courses/wdr': [200, title('Water Damage Restoration | CARSI')] }, 0, false);
await jsonPath(
  'exit 0, note only',
  { '/courses/ppe': [200, title('PPE for Water Damage Restoration Technicians | CARSI')] },
  0,
  false,
);
await jsonPath(
  'exit 1, violation',
  { '/courses/wrt': [200, title('Water Restoration Technician | CARSI')] },
  1,
  false,
);
await jsonPath('exit 2, no usable title', { '/courses/untitled': [200, NOTITLE] }, 2, true);
await jsonPath(
  'exit 2, partial coverage carries a reason',
  { '/courses/ok': [200, title('Clean Course | CARSI')], '/courses/untitled': [200, NOTITLE] },
  2,
  true,
);
await jsonPath('exit 2, HTTP 500', { '/courses/boom': [500, title('Server Error | CARSI')] }, 2, true);
await jsonPath('exit 2, empty sitemap', {}, 2, true);

// --- CodeRabbit #674 finding 367: numeric character references were a real bypass ---
// titleOf decoded five NAMED entities only, so a title served as `&#87;RT` or `&#x57;RT` reached
// scanCourse still encoded and every acronym rule stayed silent. Same evasion class the lookalike
// folding already covers, arriving through a different door.

console.log('live-catalogue guard — numeric character references must not bypass the rules');

check('decodes DECIMAL numeric references', () => {
  assert.equal(decodeEntities('&#87;RT'), 'WRT');
  assert.equal(decodeEntities('&#65;SD'), 'ASD');
});

check('decodes HEX numeric references in both letter cases', () => {
  assert.equal(decodeEntities('&#x57;RT'), 'WRT');
  assert.equal(decodeEntities('&#X41;SD'), 'ASD');
});

check('still decodes the five named entities', () => {
  assert.equal(decodeEntities('a&amp;b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#39;f&#39;'), 'a&b <c> "d" \'e\' \'f\'');
});

check('does NOT decode recursively — &amp;#87; stays literal', () => {
  // One pass, never two. A second pass would turn an author's deliberately escaped text
  // "&#87;RT" into the acronym WRT and flag a page that never displayed it.
  assert.equal(decodeEntities('&amp;#87;RT'), '&#87;RT');
});

check('leaves an out-of-range code point as written instead of crashing', () => {
  assert.equal(decodeEntities('&#99999999;x'), '&#99999999;x');
  assert.equal(decodeEntities('&#xD800;x'), '&#xD800;x');
});

check('leaves an unknown named entity untouched', () => {
  assert.equal(decodeEntities('a&nbsp;b'), 'a&nbsp;b');
});

check('titleOf runs the decode, so an encoded acronym reaches scanCourse', () => {
  const decoded = titleOf('<html><head><title>&#87;RT Fundamentals | CARSI</title></head></html>');
  assert.equal(decoded, 'WRT Fundamentals | CARSI');
  const hits = scanCourse({ slug: 'advanced-drying-fundamentals', title: decoded });
  assert.ok(
    hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'),
    'the acronym rule must fire on the decoded title',
  );
});

await checkE2E(
  'exits 1 when a banned acronym is served as a DECIMAL character reference',
  { '/courses/advanced-drying-fundamentals': [200, title('&#87;RT Fundamentals | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'a numeric character reference must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

await checkE2E(
  'exits 1 when a banned acronym is served as a HEX character reference',
  { '/courses/advanced-drying-fundamentals': [200, title('&#x41;SD Fundamentals | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'a hex character reference must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

// --- CodeRabbit #674 finding 355: fetch had no timeout ---
// A server that accepts the connection and then says nothing held the audit open indefinitely.
// An audit that never returns is an audit that never fails: in CI it burns the job timeout and
// reports as infrastructure flake, and run by hand it looks like a slow network. Either way the
// licence question goes unanswered while reading as "not a violation".

console.log('live-catalogue guard — a hung server must not hang the audit');

await (async () => {
  const name = 'exits 2 (not forever) when a course page never responds';
  const held = [];
  const server = http.createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (path === '/sitemap.xml') {
      const port = server.address().port;
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(
        `<?xml version="1.0"?><urlset><url><loc>http://127.0.0.1:${port}/courses/hangs</loc></url></urlset>`,
      );
      return;
    }
    held.push(res); // accepted, and never answered
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const child = spawn(process.execPath, [GUARD, '--json'], {
    env: {
      ...process.env,
      CARSI_SITE: `http://127.0.0.1:${server.address().port}`,
      CARSI_FETCH_TIMEOUT_MS: '300',
    },
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  // The watchdog is the control: if the guard has no timeout of its own, this is what stops the
  // suite, and `code === null` is how the assertion below can tell that happened.
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 10_000);
  const code = await new Promise((resolve) => child.on('close', resolve));
  clearTimeout(watchdog);
  for (const res of held) res.destroy();
  server.close();

  try {
    assert.notEqual(code, null, 'the guard never timed out on its own — the watchdog had to kill it');
    assert.equal(code, 2, 'a hung page must end the audit as "could not audit", not hang');
    const parsed = JSON.parse(out);
    assert.ok(parsed.error, 'the timeout must be reported as a machine-readable reason');
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
})();

// --- CodeRabbit #674 finding 507: the top-level catch broke the --json contract ---
// The header promises one parseable object on EVERY exit path. The unexpected-failure handler
// wrote human text to stderr and left stdout empty, so a consumer got a parse error instead of a
// reason — indistinguishable from a crashed run, and the same silence the guard exists to break.
//
// This is exercised through a genuinely reachable throw rather than a stubbed one: a malformed
// CARSI_FETCH_TIMEOUT_MS. Before the fix that also degraded silently — Number.parseInt('abc') is
// NaN and AbortSignal.timeout(NaN) aborts at 0ms, so every request failed and the audit blamed
// the network for what was a typo in an env var.

console.log('live-catalogue guard — an UNEXPECTED failure must still be parseable JSON');

check('parseFetchTimeout defaults when unset or empty', () => {
  assert.equal(parseFetchTimeout(undefined), DEFAULT_FETCH_TIMEOUT_MS);
  assert.equal(parseFetchTimeout(''), DEFAULT_FETCH_TIMEOUT_MS);
});

check('parseFetchTimeout accepts a positive whole number', () => {
  assert.equal(parseFetchTimeout('300'), 300);
});

check('parseFetchTimeout refuses a malformed override instead of coercing it', () => {
  for (const bad of ['abc', '0', '-5', '1.5', 'NaN']) {
    assert.throws(() => parseFetchTimeout(bad), /CARSI_FETCH_TIMEOUT_MS/, `must refuse ${bad}`);
  }
});

check('cannotAuditReport is the one failure shape, and it is non-vacuous', () => {
  const report = cannotAuditReport('because');
  assert.equal(report.error, 'because');
  assert.equal(report.checked, 0);
  assert.deepEqual(report.violations, []);
  assert.deepEqual(report.notes, []);
});

await (async () => {
  const name = '--json is parseable when an UNEXPECTED error reaches the top-level handler';
  const server = await serve({ '/courses/clean': [200, title('Clean Course | CARSI')] });
  const { code, out } = await new Promise((resolve) => {
    const child = spawn(process.execPath, [GUARD, '--json'], {
      env: {
        ...process.env,
        CARSI_SITE: `http://127.0.0.1:${server.address().port}`,
        CARSI_FETCH_TIMEOUT_MS: 'abc',
      },
    });
    let o = '';
    child.stdout.on('data', (d) => (o += d));
    child.on('close', (c) => resolve({ code: c, out: o }));
  });
  server.close();
  try {
    assert.equal(code, 2, 'an unexpected failure must exit 2, never 0');
    const parsed = JSON.parse(out); // throws if stdout is empty — the defect being pinned
    assert.match(parsed.error, /CARSI_FETCH_TIMEOUT_MS/, 'the reason must name the real cause');
    assert.equal(parsed.checked, 0);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}\n      stdout: ${JSON.stringify(out.slice(0, 120))}`);
  }
})();

// --- Independent review (gpt-5.5-high, 2026-08-19): two more ways to stay silent ---
// Found by planting the input, not by reading the regex. Both are the same disease as the
// numeric-entity bypass: a form a BROWSER renders as a banned acronym that this guard did not
// recognise as one.

console.log('live-catalogue guard — zero-width characters must not split an acronym');

check('folds away a zero-width joiner inside an acronym', () => {
  // "W‍RT" renders as WRT. NFKC does not remove default-ignorable characters, so the
  // acronym rule never saw it.
  assert.equal(fold('W‍RT'), 'WRT');
});

check('folds away the other default-ignorables an author can paste', () => {
  assert.equal(fold('A​S‌D'), 'ASD'); // zero-width space, zero-width non-joiner
  assert.equal(fold('F﻿SRT'), 'FSRT'); // BOM / zero-width no-break space
  assert.equal(fold('C­CT'), 'CCT'); // soft hyphen
});

check('fires on a title whose acronym is split by a zero-width joiner', () => {
  const hits = scanCourse({
    slug: 'water-damage-essentials',
    title: 'Water Damage W‍RT Essentials | CARSI',
  });
  assert.ok(hits.some((h) => h.rule === 'title-acronym' && h.detail === 'WRT'));
});

console.log('live-catalogue guard — a slug must be read as the browser resolves it');

check('slugOf percent-decodes, so w%72t-hidden is read as wrt-hidden', () => {
  assert.equal(slugOf('http://x/courses/w%72t-hidden'), 'wrt-hidden');
});

check('slugOf strips a query string and a fragment', () => {
  assert.equal(slugOf('http://x/courses/wrt?utm=1'), 'wrt');
  assert.equal(slugOf('http://x/courses/wrt#top'), 'wrt');
  assert.equal(slugOf('http://x/courses/wrt/'), 'wrt');
});

check('slugOf reads malformed percent-encoding literally instead of crashing', () => {
  assert.equal(slugOf('http://x/courses/100%-clean'), '100%-clean');
});

check('a percent-encoded banned slug still fires', () => {
  const hits = scanCourse({ slug: slugOf('http://x/courses/w%72t-hidden'), title: 'Clean | CARSI' });
  assert.ok(hits.some((h) => h.rule === 'slug-acronym' && h.detail === 'WRT'));
});

await checkE2E(
  'exits 1 on a percent-encoded banned slug served end to end',
  { '/courses/w%72t-hidden': [200, title('Water Damage Essentials | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'a percent-encoded slug must not bypass the slug rules');
    assert.match(combined, /slug-acronym/);
  },
);

await checkE2E(
  'exits 1 on a title whose acronym is split by a zero-width joiner, end to end',
  {
    '/courses/water-damage-essentials': [200, title('Water Damage W‍RT Essentials | CARSI')],
  },
  ({ code, combined }) => {
    assert.equal(code, 1, 'a zero-width joiner must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

// --- Independent review round 2 (gpt-5.5-high, 2026-08-19): two P1 release blockers ---
// Both are the SAME disease as the fixes above, one notch finer: a form an HTML parser renders
// as a banned acronym that this decoder did not. Verified against `html.unescape` rather than
// assumed — a browser decodes a numeric reference even when the author omits the semicolon.

console.log('live-catalogue guard — numeric references without a semicolon, and overlong padding');

check('decodes a decimal reference with NO closing semicolon', () => {
  assert.equal(decodeEntities('&#87RT'), 'WRT');
});

check('decodes a hex reference with NO closing semicolon', () => {
  assert.equal(decodeEntities('&#x57RT'), 'WRT');
});

check('decodes arbitrarily zero-padded references', () => {
  assert.equal(decodeEntities('&#000000087;RT'), 'WRT');
  assert.equal(decodeEntities('&#x00000057;RT'), 'WRT');
});

check('decodes the legacy named references a browser accepts without a semicolon', () => {
  // `&ampWRT` renders as `&WRT`. Leaving it encoded hid the acronym behind "amp".
  assert.equal(decodeEntities('&ampWRT'), '&WRT');
});

check('STILL does not decode recursively, now that semicolons are optional', () => {
  assert.equal(decodeEntities('&amp;#87;RT'), '&#87;RT');
  assert.equal(decodeEntities('&amp;#87RT'), '&#87RT');
});

check('STILL leaves an unknown named entity and ordinary ampersand copy untouched', () => {
  assert.equal(decodeEntities('a&nbsp;b'), 'a&nbsp;b');
  assert.equal(decodeEntities('AT&T Restoration'), 'AT&T Restoration');
  assert.equal(decodeEntities('R&D and Cleaning & Drying'), 'R&D and Cleaning & Drying');
});

check('STILL refuses an out-of-range code point', () => {
  assert.equal(decodeEntities('&#999999999999;x'), '&#999999999999;x');
  assert.equal(decodeEntities('&#xD800;x'), '&#xD800;x');
});

await checkE2E(
  'exits 1 on a semicolonless numeric reference served end to end',
  { '/courses/advanced-drying-fundamentals': [200, title('&#87RT Fundamentals | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'a semicolonless numeric reference must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

await checkE2E(
  'exits 1 on an overlong zero-padded numeric reference served end to end',
  { '/courses/advanced-drying-fundamentals': [200, title('&#000000087;RT Fundamentals | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'zero padding must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

console.log('live-catalogue guard — the invisible set must be the runtime\'s, not hand-maintained');

check('folds away U+034F COMBINING GRAPHEME JOINER', () => {
  assert.equal(fold('W͏RT'), 'WRT');
});

check('folds away U+061C ARABIC LETTER MARK', () => {
  assert.equal(fold('A؜SD'), 'ASD');
});

check('folds away the wider default-ignorable set', () => {
  assert.equal(fold('FㅤSRT'), 'FSRT'); // Hangul filler
  assert.equal(fold('C️CT'), 'CCT'); // variation selector
  assert.equal(fold('T⁠CST'), 'TCST'); // word joiner
});

await checkE2E(
  'exits 1 on a title split by U+034F, end to end',
  { '/courses/water-damage-essentials': [200, title('Water Damage W͏RT Essentials | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'U+034F must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

await checkE2E(
  'exits 1 on a title split by U+061C, end to end',
  { '/courses/structural-drying-core': [200, title('Structural Drying A؜SD Core | CARSI')] },
  ({ code, combined }) => {
    assert.equal(code, 1, 'U+061C must not bypass the acronym rules');
    assert.match(combined, /title-acronym/);
  },
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed — the guard is not trustworthy until they pass.`);
  process.exit(1);
}
console.log('\n✓ all live-catalogue guard rules proven to fire and to stay silent.');
