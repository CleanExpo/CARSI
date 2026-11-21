#!/usr/bin/env node
/**
 * Non-vacuity test for check-au-english.mjs quiz coverage.
 *
 * The quiz pattern once matched only `-quiz.json` and `.quizzes.json`, so
 * data/seed/floor-care-quizzes.json was never read (PR #931 review). This test
 *   1. runs the guard in a temp tree with "lumber" planted in a `*-quizzes.json` file and requires
 *      exit 1 naming that file (plus a clean tree that must exit 0), and
 *   2. lists the REAL quiz files in data/seed and fails if any one is neither scanned nor skipped
 *      by name, so a new naming form cannot drop out of scope silently.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve('.');

/** Runs the guard in a temp git tree holding only `files`; returns { status, out }. */
function runIn(files) {
  const d = mkdtempSync(join(tmpdir(), 'au-english-'));
  try {
    mkdirSync(join(d, 'scripts'), { recursive: true });
    cpSync(join(repo, 'scripts/check-au-english.mjs'), join(d, 'scripts/check-au-english.mjs'));
    cpSync(join(repo, 'scripts/lib'), join(d, 'scripts/lib'), { recursive: true });
    const all = {
      'src/lib/seo/answer-engine.ts': 'export const x = "";\n',
      'src/lib/seo/llms-txt.ts': 'export const x = "";\n',
      ...files,
    };
    for (const [rel, text] of Object.entries(all)) {
      mkdirSync(join(d, rel, '..'), { recursive: true });
      writeFileSync(join(d, rel), text);
    }
    execFileSync('git', ['init', '-q'], { cwd: d });
    try {
      const out = execFileSync(process.execPath, ['scripts/check-au-english.mjs'], {
        cwd: d,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return { status: 0, out };
    } catch (e) {
      return { status: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}

const quiz = (text) =>
  JSON.stringify({
    quizzes: [{ questions: [{ questionText: text, options: ['a'], correctIndex: 0 }] }],
  });

// 1. Planted control: "lumber" in a `*-quizzes.json` file must fail and be named.
const planted = runIn({
  'data/seed/planted-course-quizzes.json': quiz('Which lumber reading is dry?'),
});
assert.equal(planted.status, 1, 'lumber in a *-quizzes.json file must exit 1');
assert.ok(
  planted.out.includes('data/seed/planted-course-quizzes.json'),
  `the planted file must be named\n${planted.out}`
);
// Every naming form in use must be read: -quiz.json and .quizzes.json too.
for (const name of ['planted-quiz.json', 'planted.quizzes.json']) {
  const r = runIn({ [`data/seed/${name}`]: quiz('Which lumber reading is dry?') });
  assert.equal(r.status, 1, `lumber in ${name} must exit 1`);
}
// Positive control: the same tree with Australian wording passes, so the 1s above come from the plant.
assert.equal(
  runIn({ 'data/seed/planted-course-quizzes.json': quiz('Which timber reading is dry?') }).status,
  0,
  'clean quiz must pass'
);

// 2. Real coverage: every quiz file in data/seed is scanned or skipped by name.
const { quizFilesToScan, QUIZ_PENDING_FIX } = await import(
  pathToFileURL(join(repo, 'scripts/check-au-english.mjs')).href
);
const real = readdirSync(join(repo, 'data/seed'))
  .filter((f) => /quiz/i.test(f) && f.endsWith('.json'))
  .map((f) => `data/seed/${f}`);
assert.ok(real.length > 0, 'found no quiz files in data/seed: the coverage check would be vacuous');
const scanned = new Set(quizFilesToScan(real));
const missed = real.filter((f) => !scanned.has(f) && !QUIZ_PENDING_FIX.has(f));
assert.deepEqual(
  missed,
  [],
  `quiz files neither scanned nor skipped by name: ${missed.join(', ')}`
);

// 3. Draft courses (data/courses/<slug>/v1-draft, first-wave spec AC-W0-3): "mold" planted once in
// a draft catalogue JSON and once in a draft markdown file must fail, naming both files.
const draftCatalogue = JSON.stringify({ courses: [{ title: 'Mould basics', description: 'Black mold on plasterboard.' }] });
const drafts = runIn({
  'data/courses/planted/v1-draft/courses-catalog.json': draftCatalogue,
  'data/courses/planted/v1-draft/field-tools/checklist.md': '# Checklist\n\nBag the mold-affected carpet.\n',
  'data/courses/planted/v1-draft/evidence/notes.md': 'Source quote: "mold" (US source, not CARSI copy).\n',
});
assert.equal(drafts.status, 1, `mold in draft course copy must exit 1\n${drafts.out}`);
for (const f of ['data/courses/planted/v1-draft/courses-catalog.json', 'data/courses/planted/v1-draft/field-tools/checklist.md']) {
  assert.ok(drafts.out.includes(f), `the planted draft file ${f} must be named\n${drafts.out}`);
}
assert.ok(drafts.out.includes('"mold"'), `the word must be named\n${drafts.out}`);
assert.ok(!drafts.out.includes('evidence/notes.md'), `evidence/ holds source quotes and is not scanned\n${drafts.out}`);

// The clean draft passes and says how much it read.
const cleanDraft = runIn({
  'data/courses/clean/v1-draft/courses-catalog.json': JSON.stringify({ courses: [{ title: 'Mould basics' }] }),
  'data/courses/clean/v1-draft/research-pack.md': '# Research\n\nMould grows on damp plasterboard.\n',
});
assert.equal(cleanDraft.status, 0, `a clean draft must pass\n${cleanDraft.out}`);
assert.ok(cleanDraft.out.includes('scanned 2 draft files across 1 drafts'), cleanDraft.out);

// A draft folder holding no copy at all is a scope hole, not a pass.
const hollow = runIn({ 'data/courses/hollow/v1-draft/evidence/evidence-ledger.jsonl': '{}\n' });
assert.equal(hollow.status, 1, `a draft folder with nothing to scan must fail\n${hollow.out}`);
assert.ok(hollow.out.includes('data/courses/hollow/v1-draft'), hollow.out);

console.log(
  `check-au-english: planted lumber caught in all 3 quiz naming forms; ${real.length} real seed quiz files covered; planted mold caught in draft JSON and markdown`
);
