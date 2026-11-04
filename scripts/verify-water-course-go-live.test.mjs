#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  APPROVED_QUIZ_IDS,
  EXPECTED_TITLE,
  SLUG,
  probeLiveCoursePage,
  quizIdsFromCatalogLessons,
  validateRepo,
} from './verify-water-course-go-live.mjs';

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

console.log('verify-water-course-go-live');

check('repo validation passes on real seed data', () => {
  const r = validateRepo();
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.ok(r.notes.some((n) => n.includes('Course Standard')));
});

check('catalog quiz lesson ids match approved list', () => {
  const r = validateRepo();
  assert.equal(r.ok, true);
  assert.ok(r.notes.some((n) => n.includes('align with approved')));
  assert.equal(APPROVED_QUIZ_IDS.length, 7);
});

check('probe treats 404 Course Not Found as not live', async () => {
  const probe = await probeLiveCoursePage('https://example.test', async () => ({
    status: 404,
    text: async () => '<title>Course Not Found | CARSI</title>',
  }));
  assert.equal(probe.ok, false);
  assert.equal(probe.notFound, true);
});

check('probe passes on 200 with expected title', async () => {
  const probe = await probeLiveCoursePage('https://example.test', async () => ({
    status: 200,
    text: async () => `<h1>${EXPECTED_TITLE}</h1>`,
  }));
  assert.equal(probe.ok, true);
});

check('quizIdsFromCatalogLessons reads uuid bodies', () => {
  const ids = quizIdsFromCatalogLessons({
    modules: [
      {
        lessons: [
          { contentType: 'text', contentBody: 'x' },
          { contentType: 'quiz', contentBody: APPROVED_QUIZ_IDS[0] },
        ],
      },
    ],
  });
  assert.deepEqual(ids, [APPROVED_QUIZ_IDS[0]]);
});

if (failures) {
  console.error(`\n${failures} failed\n`);
  process.exit(1);
}
console.log(`\nAll checks passed (${SLUG}).\n`);
