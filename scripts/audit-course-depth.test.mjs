#!/usr/bin/env node
/**
 * Non-vacuity test for scripts/audit-course-depth.mjs (Course Standard v1).
 *
 * The audit runs report-only on the real catalogue and exits 0 while 0 of 78 courses meet the
 * standard, so nothing else can tell a working floor from one that always passes. Each case here
 * starts from a fixture course that meets every floor, knocks out exactly one element, and
 * asserts that the floor fails. The CLI cases prove the --ci gate exits 1 on
 * an opted-in course below the floors, 0 when the only failures are on unmarked courses, and 2
 * on input it cannot trust.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  scoreCourse,
  loadContext,
  decide,
  FLOORS,
  hasPartHeading,
  isFieldDownload,
} from './audit-course-depth.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SCRIPT = join(HERE, 'audit-course-depth.mjs');
const PASSING_DIR = join(HERE, 'fixtures/course-standard/passing');
const FAILING_DIR = join(HERE, 'fixtures/course-standard/failing');

const ctx = loadContext(PASSING_DIR);
const base = JSON.parse(
  readFileSync(join(PASSING_DIR, 'courses-catalog.json'), 'utf8')
).courses.find((c) => c.slug === 'fixture-standard-v1-passing');
const clone = () => structuredClone(base);
const teachingLessons = (c) =>
  c.modules.flatMap((m) => m.lessons.filter((l) => l.contentType !== 'quiz'));

test('baseline fixture meets every applicable floor', () => {
  const s = scoreCourse(clone(), ctx);
  assert.deepEqual(s.failing, [], JSON.stringify(s.floors, null, 2));
  assert.equal(s.applicable, FLOORS.length - 1); // practical is n/a for an L1 non-designation course
});

/** [floor, label, mutate(course) | { mutate, ctx }] */
const KNOCKOUTS = [
  ['metadata', 'meta.standardLevel unknown', (c) => (c.meta.standardLevel = 'Level 2')],
  ['metadata', 'rolePaths empty', (c) => (c.meta.rolePaths = [])],
  ['metadata', 'rolePaths names an unknown path', (c) => (c.meta.rolePaths = ['water'])],
  ['structure', 'only three modules', (c) => c.modules.splice(0, 1)],
  ['structure', 'seven modules', (c) => c.modules.push(...structuredClone(c.modules.slice(0, 3)))],
  ['structure', 'a module with two lessons', (c) => c.modules[0].lessons.splice(0, 1)],
  ['depth', 'stated hours far above the content', (c) => (c.durationHours = 10)],
  [
    'moduleChecks',
    'a module with no quiz lesson',
    (c) =>
      (c.modules[1].lessons = c.modules[1].lessons
        .filter((l) => l.contentType !== 'quiz')
        .concat(structuredClone(c.modules[1].lessons[0]))),
  ],
  [
    'moduleChecks',
    'a quiz id that does not resolve',
    (c) => (c.modules[0].lessons[2].contentBody = '00000000-0000-4000-8000-999999999999'),
  ],
  [
    'moduleChecks',
    'too few questions for the teaching lessons',
    null,
    () => {
      const q = structuredClone(ctx);
      const id = base.modules[0].lessons[2].contentBody;
      q.quizzes.set(id, {
        ...q.quizzes.get(id),
        questions: q.quizzes.get(id).questions.slice(0, 5),
      });
      return q;
    },
  ],
  [
    'explanations',
    'a question without an explanation',
    null,
    () => {
      const q = structuredClone(ctx);
      const id = base.modules[0].lessons[2].contentBody;
      const quiz = structuredClone(q.quizzes.get(id));
      delete quiz.questions[0].explanation;
      q.quizzes.set(id, quiz);
      return q;
    },
  ],
  [
    'finalQuiz',
    'final quiz with nine questions',
    null,
    () => {
      const q = structuredClone(ctx);
      const id = base.modules[3].lessons[2].contentBody;
      q.quizzes.set(id, {
        ...q.quizzes.get(id),
        questions: q.quizzes.get(id).questions.slice(0, 9),
      });
      return q;
    },
  ],
  [
    'finalQuiz',
    'final quiz pass mark 60%',
    null,
    () => {
      const q = structuredClone(ctx);
      const id = base.modules[3].lessons[2].contentBody;
      q.quizzes.set(id, { ...q.quizzes.get(id), passPercentage: 60 });
      return q;
    },
  ],
  [
    'fieldDownloads',
    'a module whose only resource is a government link',
    (c) => {
      for (const l of c.modules[2].lessons)
        l.resources =
          l.contentType === 'quiz'
            ? null
            : [{ label: 'Safe Work Australia', url: 'https://www.safeworkaustralia.gov.au/' }];
    },
  ],
  [
    'lessonPattern',
    'one lesson missing the Takeaway heading',
    (c) => {
      const l = teachingLessons(c)[3];
      l.contentBody = l.contentBody.replace('<h2>Takeaway</h2>', '<p>');
    },
  ],
  [
    'lessonWords',
    'one lesson trimmed under 400 words',
    (c) => {
      const l = teachingLessons(c)[0];
      l.contentBody = l.contentBody.replace(
        /<h2>The idea<\/h2>[\s\S]*?<h2>See it<\/h2>/,
        '<h2>The idea</h2><p>Short.</p><h2>See it</h2>'
      );
    },
  ],
  [
    'visual',
    'one lesson with no image and no visual resource',
    (c) => {
      const l = teachingLessons(c)[5];
      l.contentBody = l.contentBody.replace(/<img[^>]*>/, '');
    },
  ],
  [
    'metricExample',
    'one lesson with no metric quantity',
    (c) => {
      const l = teachingLessons(c)[2];
      l.contentBody = l.contentBody
        .replace(
          /<h2>On the job<\/h2><p>[\s\S]*?<\/p>/,
          '<h2>On the job</h2><p>A kitchen flooded.</p>'
        )
        .replace(
          /<h2>Do it in metric<\/h2><p>[\s\S]*?<\/p>/,
          '<h2>Do it in metric</h2><p>Work it out on site.</p>'
        );
    },
  ],
  [
    'practical',
    'a designation course with no practical task',
    (c) => (c.meta.designation = 'CARSI Water Restoration Practitioner'),
  ],
  [
    'practical',
    'an L2 course with no practical task',
    (c) => (c.meta.standardLevel = 'L2-practitioner'),
  ],
  [
    'australian',
    'US spelling in a lesson',
    (c) => (teachingLessons(c)[0].contentBody += '<p>Check for mold.</p>'),
  ],
  [
    'australian',
    'US mains voltage in a title',
    (c) => (c.modules[0].title = 'Running a 115V dehumidifier'),
  ],
  ['licence', 'cecHours set without an approval', (c) => (c.cecHours = 2)],
  [
    'licence',
    'designation course with iicrcDiscipline set',
    (c) => {
      c.meta.designation = 'CARSI Water Restoration Practitioner';
      c.iicrcDiscipline = 'WRT';
    },
  ],
  [
    'licence',
    'banned IICRC selling phrase in the description',
    (c) => (c.description = 'Get IICRC certified with CARSI in one weekend.'),
  ],
];

for (const [floor, label, mutate, makeCtx] of KNOCKOUTS) {
  test(`${floor} fails: ${label}`, () => {
    const c = clone();
    if (mutate) mutate(c);
    const s = scoreCourse(c, makeCtx ? makeCtx() : ctx);
    assert.equal(s.floors[floor].applicable, true, `${floor} should apply`);
    assert.equal(s.floors[floor].ok, false, `${floor} should fail for: ${label}`);
  });
}

test('every floor has at least one knockout case', () => {
  const covered = new Set(KNOCKOUTS.map(([f]) => f));
  assert.deepEqual(
    FLOORS.filter((f) => !covered.has(f)),
    []
  );
});

test('practical passes once a seed assessment with a rubric exists', () => {
  const c = clone();
  c.meta.standardLevel = 'L2-practitioner';
  const q = structuredClone(ctx);
  q.practicals.set(c.slug, { instructions: 'Submit a moisture map.', criteria: [{}, {}, {}] });
  assert.equal(scoreCourse(c, q).floors.practical.ok, true);
});

test('heading and download helpers', () => {
  assert.equal(
    hasPartHeading('<h3 class="x"><strong>On the job</strong></h3>', 'On the job'),
    true
  );
  assert.equal(hasPartHeading('<p>On the job</p>', 'On the job'), false);
  assert.equal(hasPartHeading('## Takeaway', 'Takeaway'), true);
  assert.equal(isFieldDownload({ url: 'https://x.test/card.pdf' }), true);
  assert.equal(isFieldDownload({ url: 'quiz:abc.pdf' }), false);
  assert.equal(isFieldDownload({ url: 'https://x.test/narration.mp3', kind: 'audio' }), false);
});

test('decide: unmarked courses never fail CI; a v1 course does; bad input is exit 2', () => {
  const legacyFail = { slug: 'a', enforced: false, standardValue: undefined, failing: ['depth'] };
  const v1Fail = { slug: 'b', enforced: true, standardValue: 'v1', failing: ['depth'] };
  const v1Pass = { slug: 'c', enforced: true, standardValue: 'v1', failing: [] };
  assert.equal(decide([legacyFail, v1Pass], { ci: true }).exitCode, 0);
  assert.equal(decide([legacyFail, v1Fail], { ci: true }).exitCode, 1);
  assert.equal(decide([legacyFail, v1Fail], { ci: false }).exitCode, 0);
  assert.equal(decide([], { ci: true }).exitCode, 2);
  assert.equal(
    decide([{ slug: 'd', enforced: false, standardValue: 'V1', failing: [] }], { ci: true })
      .exitCode,
    2
  );
});

function runCli(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('CLI positive control: --ci on the failing fixture exits 1 and names the course', () => {
  const r = runCli(['--ci', `--seed-dir=${FAILING_DIR}`]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /fixture-standard-v1-failing: structure/);
});

test('CLI: --ci on the passing fixture exits 0 although an unmarked course there fails floors', () => {
  const r = runCli(['--ci', `--seed-dir=${PASSING_DIR}`]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /fixture-legacy-unmarked/);
  assert.match(r.stdout, /enforced \(meta\.standard v1\): 1/);
});

test('CLI: report mode on the failing fixture exits 0', () => {
  assert.equal(runCli([`--seed-dir=${FAILING_DIR}`]).status, 0);
});

test('CLI: missing catalogue, empty catalogue and unknown meta.standard exit 2', () => {
  const empty = mkdtempSync(join(tmpdir(), 'course-std-'));
  assert.equal(runCli(['--ci', `--seed-dir=${empty}`]).status, 2);
  writeFileSync(join(empty, 'courses-catalog.json'), JSON.stringify({ courses: [] }));
  assert.equal(runCli(['--ci', `--seed-dir=${empty}`]).status, 2);
  const typo = mkdtempSync(join(tmpdir(), 'course-std-'));
  const c = clone();
  c.meta.standard = 'V1';
  writeFileSync(join(typo, 'courses-catalog.json'), JSON.stringify({ courses: [c] }));
  assert.equal(runCli(['--ci', `--seed-dir=${typo}`]).status, 2);
});
