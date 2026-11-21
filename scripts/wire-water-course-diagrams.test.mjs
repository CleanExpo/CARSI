#!/usr/bin/env node
/**
 * Test for scripts/wire-water-course-diagrams.mjs (GP-752). Runs the wiring against copies of the
 * real catalogues in a temp folder: every mapped lesson and file exists, the edit touches only the
 * mapped lessons, a second run is a no-op, and a missing lesson or file is an error, not a skip.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
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

test('--write adds each diagram in the See it part, changes nothing else, and is idempotent', () => {
  const root = copyRepo();
  assert.equal(run(root, '--write').status, 0);
  for (const rel of CATALOGUES) {
    const course = JSON.parse(readFileSync(join(root, rel), 'utf8')).courses.find(
      (c) => c.slug === SLUG
    );
    const orig = JSON.parse(readFileSync(join(REPO, rel), 'utf8')).courses.find(
      (c) => c.slug === SLUG
    );
    const lessons = course.modules.flatMap((m) => m.lessons);
    const origLessons = orig.modules.flatMap((m) => m.lessons);
    for (const m of MAPPING) {
      const body = lessons.find((l) => l.id === m.lessonId).contentBody;
      const seeIt = body.indexOf('<h3>See it</h3>');
      const metric = body.indexOf('<h3>Do it in metric</h3>');
      for (const a of m.add) {
        const at = body.indexOf(`diagrams/${a.file}`);
        assert.ok(at > seeIt && at < metric, `${a.file} sits between See it and Do it in metric`);
      }
    }
    for (const l of origLessons.filter((x) => !MAPPING.some((m) => m.lessonId === x.id)))
      assert.equal(lessons.find((x) => x.id === l.id).contentBody, l.contentBody);
  }
  const after = CATALOGUES.map((rel) => readFileSync(join(root, rel), 'utf8'));
  const again = run(root, '--write');
  assert.equal(again.status, 0);
  assert.match(again.stdout, /already wired/);
  CATALOGUES.forEach((rel, i) => assert.equal(readFileSync(join(root, rel), 'utf8'), after[i]));
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
