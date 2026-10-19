#!/usr/bin/env node
/**
 * Non-vacuity test for check-quiz-option-balance.mjs. Each planted control is a quiz the guard
 * MUST reject; if any passes, the guard cannot fail and its green means nothing.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { questionProblems, quizProblems, wordCount } from './check-quiz-option-balance.mjs';

// Planted control 1: the classic giveaway, one long qualified correct answer.
assert.ok(
  questionProblems(['Yes', 'No', 'Only when the surface is below the dew point of the room air', 'Never']).length > 0,
  'unequal word counts must fail',
);
// Planted control 2: equal word counts but one option far longer in characters.
assert.ok(
  questionProblems(['Dry air', 'Wet air', 'Supersaturated thermodynamically-equilibrated air', 'Cold air']).some((p) =>
    p.startsWith('character'),
  ),
  'equal words but very unequal characters must fail',
);
// Planted control 3: the answer is always in the same position.
const samePos = { questions: Array.from({ length: 5 }, () => ({ options: ['One a', 'Two b', 'Six c', 'Ten d'], correctIndex: 2 })) };
assert.ok(quizProblems(samePos).some((p) => p.includes('every correct answer')), 'constant answer position must fail');

// Formatting must not hide or add words: tags and entities are not words.
assert.equal(wordCount('About 16.7 &deg;C'), 3);
assert.equal(wordCount('<strong>Eight</strong> climate zones'), 3);

// Positive control: a balanced question passes.
assert.deepEqual(questionProblems(['About 16.7 &deg;C', 'About 12.0 &deg;C', 'About 19.0 &deg;C', 'About 21.3 &deg;C']), []);

// End to end: the CLI exits 1 for an enforced unbalanced quiz and 0 when it is advisory.
const here = resolve('scripts/check-quiz-option-balance.mjs');
const dir = mkdtempSync(join(tmpdir(), 'quiz-balance-'));
try {
  mkdirSync(join(dir, 'data/seed'), { recursive: true });
  writeFileSync(
    join(dir, 'data/seed/planted-course-quiz.json'),
    JSON.stringify({ courseSlug: 'planted-course', quizzes: [{ title: 'Planted', questions: [{ options: ['Yes', 'Absolutely yes in every single case', 'No', 'Maybe'], correctIndex: 1 }] }] }),
  );
  const run = (args) => {
    try {
      execFileSync(process.execPath, [here, ...args], { cwd: dir, stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(run(['--enforce=planted-course']), 1, 'enforced unbalanced quiz must exit 1');
  assert.equal(run([]), 0, 'advisory mode exits 0');
  assert.equal(run(['--enforce=no-such-course']), 2, 'unknown enforced slug must exit 2');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('check-quiz-option-balance: all planted controls rejected, positive control passed');
