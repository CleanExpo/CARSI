#!/usr/bin/env node
/**
 * Test for scripts/wire-water-course-diagrams.mjs (GP-752). Runs the wiring against copies of the
 * real catalogues in a temp folder: every mapped lesson and file exists, the edit touches only the
 * mapped lessons, a second run is a no-op, and a missing lesson or file is an error, not a skip.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CATALOGUES, MAPPING, SLUG, wireText } from './wire-water-course-diagrams.mjs';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SCRIPT = join(REPO, 'scripts/wire-water-course-diagrams.mjs');

function copyRepo() {
  const root = mkdtempSync(join(tmpdir(), 'wire-water-'));
  symlinkSync(join(REPO, 'public'), join(root, 'public'));
  for (const rel of CATALOGUES) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(REPO, rel), join(root, rel));
  }
  return root;
}
const run = (root, ...a) =>
  spawnSync(process.execPath, [SCRIPT, `--root=${root}`, ...a], { encoding: 'utf8' });

test('every new diagram file exists in the course diagrams folder', () => {
  for (const m of MAPPING)
    for (const a of m.add)
      assert.ok(existsSync(join(REPO, 'public/courses', SLUG, 'diagrams', a.file)), a.file);
});

test('each mapped lesson is a teaching lesson in both catalogues', () => {
  for (const rel of CATALOGUES) {
    const course = JSON.parse(readFileSync(join(REPO, rel), 'utf8')).courses.find(
      (c) => c.slug === SLUG
    );
    const lessons = course.modules.flatMap((m) => m.lessons);
    for (const m of MAPPING) {
      const l = lessons.find((x) => x.id === m.lessonId);
      assert.ok(l, `${rel}: ${m.lessonId}`);
      assert.notEqual(l.contentType, 'quiz');
      assert.ok(l.contentBody.includes(`diagrams/${m.anchor}`), `${rel}: anchor ${m.anchor}`);
    }
  }
});

test('dry run on the real catalogues plans every missing insertion and writes nothing', () => {
  const root = copyRepo();
  const before = CATALOGUES.map((rel) => readFileSync(join(root, rel), 'utf8'));
  const r = run(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // Before wiring every pair is planned; once the wiring commit lands, none are (still exit 0).
  const missing = before.reduce(
    (k, raw) =>
      k + MAPPING.flatMap((m) => m.add).filter((a) => !raw.includes(`diagrams/${a.file}`)).length,
    0
  );
  assert.equal((r.stdout.match(/: \+ /g) || []).length, missing);
  CATALOGUES.forEach((rel, i) => assert.equal(readFileSync(join(root, rel), 'utf8'), before[i]));
});

const ADDS = MAPPING.flatMap((m) => m.add);
/** The exact figure block the script inserts for one diagram file. */
const blockRe = (file) =>
  new RegExp(
    `<p><img src='/courses/${SLUG}/diagrams/${file.replace(/\./g, '\\.')}'[^>]*></p><p>[^<"]*</p>`,
    'g'
  );
const strip = (text, files) => files.reduce((t, f) => t.replace(blockRe(f), ''), text);

/**
 * Run --write on `root` and check the result against what was in `root` beforehand, never
 * against the repository: the test must hold whether the repository is unwired, wired or
 * partly wired.
 */
function checkWrite(root) {
  const before = CATALOGUES.map((rel) => readFileSync(join(root, rel), 'utf8'));
  assert.equal(run(root, '--write').status, 0);
  CATALOGUES.forEach((rel, i) => {
    const written = readFileSync(join(root, rel), 'utf8');
    const course = JSON.parse(written).courses.find((c) => c.slug === SLUG);
    const lessons = course.modules.flatMap((m) => m.lessons);
    for (const m of MAPPING) {
      const body = lessons.find((l) => l.id === m.lessonId).contentBody;
      const seeIt = body.indexOf('<h3>See it</h3>');
      const metric = body.indexOf('<h3>Do it in metric</h3>');
      for (const a of m.add) {
        const at = body.indexOf(`diagrams/${a.file}`);
        assert.ok(at > seeIt && at < metric, `${a.file} sits between See it and Do it in metric`);
      }
    }
    for (const a of ADDS)
      assert.equal((written.match(blockRe(a.file)) || []).length, 1, `${rel}: one ${a.file}`);
    // Byte level: removing only the blocks that were not there before gives back the file as it
    // was, so no title, metadata, other course or formatting can change.
    const added = ADDS.map((a) => a.file).filter((f) => !blockRe(f).test(before[i]));
    assert.equal(strip(written, added), before[i], `${rel}: nothing else changed`);
  });
  const after = CATALOGUES.map((rel) => readFileSync(join(root, rel), 'utf8'));
  const again = run(root, '--write');
  assert.equal(again.status, 0);
  assert.match(again.stdout, /already wired/);
  CATALOGUES.forEach((rel, i) => assert.equal(readFileSync(join(root, rel), 'utf8'), after[i]));
}
/** A copy with every figure block removed, whatever state the repository is in. */
function unwiredCopy() {
  const root = copyRepo();
  for (const rel of CATALOGUES) {
    const p = join(root, rel);
    writeFileSync(
      p,
      strip(
        readFileSync(p, 'utf8'),
        ADDS.map((a) => a.file)
      )
    );
  }
  return root;
}

test('--write on unwired catalogues adds each diagram in See it and changes nothing else', () => {
  checkWrite(unwiredCopy());
});

test('--write on already wired catalogues changes nothing', () => {
  const root = unwiredCopy();
  assert.equal(run(root, '--write').status, 0);
  checkWrite(root);
});

test('--write on partly wired catalogues adds only what is missing', () => {
  const root = unwiredCopy();
  assert.equal(run(root, '--write').status, 0);
  const p = join(root, CATALOGUES[0]);
  writeFileSync(p, strip(readFileSync(p, 'utf8'), [ADDS[0].file]));
  checkWrite(root);
});

test('a missing lesson is an error, not a silent skip', () => {
  const raw = readFileSync(join(REPO, CATALOGUES[0]), 'utf8').replace(
    MAPPING[0].lessonId,
    'not-a-real-id'
  );
  const r = wireText(raw, REPO);
  assert.ok(r.errors.some((e) => e.includes('not found')));
});

test('a missing diagram file is an error', () => {
  const root = mkdtempSync(join(tmpdir(), 'wire-water-nofile-'));
  const r = wireText(readFileSync(join(REPO, CATALOGUES[0]), 'utf8'), root);
  assert.ok(r.errors.some((e) => e.includes('diagram file missing')));
});
