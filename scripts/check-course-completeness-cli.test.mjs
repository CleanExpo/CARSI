#!/usr/bin/env node
// Exercise the real CLI boundary, including JSON output and empty release sets.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('./check-course-completeness.mjs', import.meta.url));
const complete = {
  slug: 'complete', title: 'Complete fixture', thumbnailUrl: 'https://example.test/t.png',
  introVideoUrl: 'https://example.test/v.mp4', durationHours: 2, level: 'Foundation',
  category: 'Water', shortDescription: 'Fixture', tags: ['water'],
  modules: [{ lessons: [{ contentType: 'quiz', contentBody:
    'Learning objective: by the end you will learn. Key takeaway: practise. '.repeat(60) }] }],
};
const incomplete = { slug: 'incomplete', title: 'Incomplete fixture', modules: [] };

function run(courses, args) {
  const cwd = mkdtempSync(join(tmpdir(), 'carsi completeness '));
  try {
    mkdirSync(join(cwd, 'data/seed'), { recursive: true });
    writeFileSync(join(cwd, 'data/seed/courses-catalog.json'), JSON.stringify({ courses }));
    const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
    assert.ifError(result.error);
    return result;
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}

for (const json of [false, true]) {
  const format = json ? 'JSON' : 'text';
  const flags = json ? ['--json'] : [];
  for (const [label, courses, enforcement, expected] of [
    ['advisory gaps', [incomplete], [], 0],
    ['complete selected course', [complete, incomplete], ['--enforce=complete'], 0],
    ['incomplete selected course', [incomplete], ['--enforce=incomplete'], 1],
    ['all with gaps', [complete, incomplete], ['--enforce=all'], 1],
    ['unknown course', [complete], ['--enforce=missing'], 2],
    ['partly missing release set', [complete], ['--enforce=complete,missing'], 2],
    ['empty catalogue under all', [], ['--enforce=all'], 2],
    ['empty explicit release set', [complete], ['--enforce='], 2],
    ['bare enforce option', [complete], ['--enforce'], 2],
    ['duplicate enforcement arguments', [complete], ['--enforce=complete', '--enforce=all'], 2],
    ['comma-only release set', [complete], ['--enforce= , '], 2],
    ['complete all release set', [complete], ['--enforce=all'], 0],
  ]) {
    test(`${format}: ${label}`, () => {
      const result = run(courses, [...flags, ...enforcement]);
      assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
      if (json) {
        const report = JSON.parse(result.stdout);
        assert.ok(Array.isArray(report.scored));
        assert.equal(report.enforcement.requested, enforcement.length > 0);
        assert.equal(report.enforcement.exitCode, expected);
        if (expected === 2) assert.equal(typeof report.enforcement.error, 'string');
        if (expected === 1) assert.ok(report.enforcement.failing.includes('incomplete'));
      }
    });
  }
}
