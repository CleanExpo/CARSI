#!/usr/bin/env node
/**
 * Non-vacuity test for scripts/check-course-visuals.mjs (Linear GP-752).
 *
 * The check passes on main only because today's gaps are frozen in a baseline, so a pass on the
 * real catalogue says nothing about whether it can fail. Each case here builds a small repository
 * in a temp folder, starting from a course that meets the rule, changes one thing, and asserts the
 * exit code. One case plants a lesson without a diagram into a copy of the real catalogue, with the
 * real baseline, and proves the gate goes red there too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { catalogueFiles } from './check-course-visuals.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..');
const SCRIPT = join(HERE, 'check-course-visuals.mjs');

const IMG = '/courses/fix/images/l1.webp';
const SVG = '/courses/fix/diagrams/l1.svg';

function lesson(id, body, resources = []) {
  return { id, title: `Lesson ${id}`, contentType: 'text', contentBody: body, resources };
}
const good = (id) =>
  lesson(id, `<h3>See it</h3><img src="${IMG}" alt="a"><img src='${SVG}' alt='b'>`);
function course(over = {}) {
  return {
    slug: 'fix',
    title: 'Fixture',
    thumbnailUrl: '/courses/fix/images/cover.webp',
    meta: { standard: 'v1' },
    modules: [
      {
        title: 'M1',
        lessons: [
          good('a'),
          good('b'),
          { id: 'q', title: 'Check', contentType: 'quiz', contentBody: 'quiz-1' },
        ],
      },
    ],
    ...over,
  };
}
function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}
/** A temp repository with the fixture files on disk, a catalogue and a baseline. */
function repo({ courses = [course()], drafts = {}, baseline = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'course-visuals-'));
  for (const f of ['images/l1.webp', 'images/cover.webp', 'diagrams/l1.svg'])
    write(root, `public/courses/fix/${f}`, 'x');
  write(root, 'data/seed/courses-catalog.json', JSON.stringify({ courses }));
  for (const [slug, list] of Object.entries(drafts))
    write(
      root,
      `data/courses/${slug}/v1-draft/courses-catalog.json`,
      JSON.stringify({ courses: list })
    );
  write(root, 'scripts/course-visuals-baseline.json', JSON.stringify({ gaps: baseline }));
  return root;
}
function run(root, extra = []) {
  const r = spawnSync(process.execPath, [SCRIPT, `--root=${root}`, ...extra], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}
const gap = (lessonId, missing, file = 'data/seed/courses-catalog.json') => ({
  file,
  slug: 'fix',
  lessonId,
  lessonTitle: '',
  missing,
});

test('a course with a cover, and an image and a diagram in every teaching lesson, passes', () => {
  const r = run(repo());
  assert.equal(r.code, 0, r.out);
});

test('a planted teaching lesson without a diagram fails', () => {
  const c = course();
  c.modules[0].lessons.push(lesson('planted', `<img src="${IMG}" alt="a">`));
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /planted.*missing diagram/);
});

test('a planted teaching lesson without a lesson image fails', () => {
  const c = course();
  c.modules[0].lessons.push(lesson('planted', `<img src="${SVG}" alt="b">`));
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /planted.*missing image/);
});

test('removing the cover fails', () => {
  const r = run(repo({ courses: [course({ thumbnailUrl: null })] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /missing cover/);
});

test('removing an existing diagram from a lesson fails', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson('a', `<img src="${IMG}" alt="a">`);
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\ba\b.*missing diagram/);
});

test('a gap listed in the baseline passes; once fixed, the stale entry fails', () => {
  const c = course();
  c.modules[0].lessons[1] = lesson('b', `<img src="${SVG}" alt="b">`);
  assert.equal(run(repo({ courses: [c], baseline: [gap('b', 'image')] })).code, 0);
  const fixed = run(repo({ baseline: [gap('b', 'image')] }));
  assert.equal(fixed.code, 1, fixed.out);
  assert.match(fixed.out, /no longer gaps/);
});

test('a baseline entry for a different kind does not cover the gap', () => {
  const c = course();
  c.modules[0].lessons[1] = lesson('b', `<img src="${SVG}" alt="b">`);
  const r = run(repo({ courses: [c], baseline: [gap('b', 'diagram')] }));
  assert.equal(r.code, 1, r.out);
});

test('an SVG diagram resource of kind "image" does not count as the lesson image', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson('a', `<img src="${SVG}" alt="b">`, [
    { label: 'Diagram', url: SVG, kind: 'image' },
  ]);
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\ba\b.*missing image/);
});

test('a referenced file that does not exist counts as missing', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson(
    'a',
    `<img src="${IMG}"><img src="/courses/fix/diagrams/nope.svg">`
  );
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\ba\b.*missing diagram/);
});

test('an SVG outside a diagrams folder does not count as a diagram', () => {
  const root = repo();
  write(root, 'public/courses/fix/images/l2.svg', 'x');
  const c = course();
  c.modules[0].lessons[0] = lesson('a', `<img src="${IMG}"><img src="/courses/fix/images/l2.svg">`);
  write(root, 'data/seed/courses-catalog.json', JSON.stringify({ courses: [c] }));
  assert.equal(run(root).code, 1);
});

test('lesson image and diagram given as resources count', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson('a', 'text only', [
    { label: 'Photo', url: IMG, kind: 'image' },
    { label: 'Diagram', url: SVG, kind: 'image' },
  ]);
  assert.equal(run(repo({ courses: [c] })).code, 0);
});

test('quiz lessons and courses without meta.standard v1 are not checked', () => {
  const other = { slug: 'old', modules: [{ lessons: [lesson('x', 'no visuals')] }] };
  assert.equal(run(repo({ courses: [course(), other] })).code, 0);
});

test('a v1-draft catalogue is scanned', () => {
  const d = course();
  d.modules[0].lessons.push(lesson('draft-new', `<img src="${IMG}">`));
  const r = run(repo({ drafts: { fix: [d] } }));
  assert.equal(r.code, 1, r.out);
  assert.match(
    r.out,
    /data\/courses\/fix\/v1-draft\/courses-catalog\.json.*draft-new.*missing diagram/
  );
});

test('a known draft gap stays known when the draft is promoted to the seed', () => {
  const d = course();
  d.modules[0].lessons.push(lesson('draft-gap', `<img src="${IMG}">`));
  const known = [gap('draft-gap', 'diagram', 'ignored')];
  // in the draft folder, alongside a seed course with the same slug and lessons
  assert.equal(run(repo({ courses: [d], drafts: { fix: [d] }, baseline: known })).code, 0);
  // promoted: only in the seed
  assert.equal(run(repo({ courses: [d], baseline: known })).code, 0);
  // still only a draft
  assert.equal(run(repo({ courses: [], drafts: { fix: [d] }, baseline: known })).code, 0);
});

test('fixing a gap in the seed but not in the draft copy keeps the entry live', () => {
  const d = course();
  d.modules[0].lessons.push(lesson('draft-gap', `<img src="${IMG}">`));
  const fixed = course();
  fixed.modules[0].lessons.push(good('draft-gap'));
  const known = [gap('draft-gap', 'diagram')];
  assert.equal(run(repo({ courses: [fixed], drafts: { fix: [d] }, baseline: known })).code, 0);
  assert.equal(run(repo({ courses: [fixed], drafts: { fix: [fixed] }, baseline: known })).code, 1);
});

test('no v1 course at all is an input error, not a pass', () => {
  const r = run(repo({ courses: [{ slug: 'old', modules: [] }] }));
  assert.equal(r.code, 2, r.out);
});

test('a malformed baseline is an input error', () => {
  const root = repo();
  write(root, 'scripts/course-visuals-baseline.json', JSON.stringify({ gaps: [{ file: 'x' }] }));
  assert.equal(run(root).code, 2);
});

test('real catalogue and baseline: passes as is, and fails with a planted lesson missing a diagram', () => {
  const root = mkdtempSync(join(tmpdir(), 'course-visuals-real-'));
  symlinkSync(join(REPO, 'public'), join(root, 'public'));
  for (const rel of catalogueFiles(REPO)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(REPO, rel), join(root, rel));
  }
  mkdirSync(join(root, 'scripts'));
  cpSync(
    join(REPO, 'scripts/course-visuals-baseline.json'),
    join(root, 'scripts/course-visuals-baseline.json')
  );
  assert.equal(run(root).code, 0, 'real catalogue should pass with the frozen baseline');

  const rel = 'data/seed/courses-catalog.json';
  const cat = JSON.parse(readFileSync(join(root, rel), 'utf8'));
  const mm = cat.courses.find((c) => c.slug === 'moisture-meters-readings-and-dry-standards');
  assert.ok(mm, 'moisture-meters course is in the seed catalogue');
  const donor = mm.modules[0].lessons.find((l) => l.contentType !== 'quiz');
  const planted = structuredClone(donor);
  planted.id = 'planted-no-diagram';
  planted.contentBody = planted.contentBody.replace(/<img\b[^>]*\.svg[^>]*>/gi, '');
  planted.resources = (planted.resources || []).filter((r) => !/\.svg$/i.test(r?.url || ''));
  mm.modules[0].lessons.push(planted);
  writeFileSync(join(root, rel), JSON.stringify(cat));
  const r = run(root);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /planted-no-diagram.*missing diagram/);
  assert.doesNotMatch(r.out, /planted-no-diagram.*missing image/);
});

// GP-754: URL parsing findings from the GP-752 Codex review. Each case failed on the old parser.

test('a protocol-relative URL is remote, not a file under public/', () => {
  // //cdn.example.com/... is fetched over the page's own scheme (https on the live site), like an
  // https URL. The old parser looked for public/cdn.example.com/... and reported it missing.
  const c = course({ thumbnailUrl: '//cdn.example.com/cover.webp' });
  c.modules[0].lessons[0] = lesson('a', `<img src="//cdn.example.com/l1.webp"><img src="${SVG}">`);
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 0, r.out);
});

test('data-src attributes and images inside HTML comments do not count', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson(
    'a',
    `<img data-src="${IMG}" alt="lazy"><!-- <img src="${SVG}"> --><p>text</p>`
  );
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\ba\b.*missing image/);
  assert.match(r.out, /\ba\b.*missing diagram/);
});

test('an unquoted <img src=...> value is read', () => {
  const c = course();
  c.modules[0].lessons[0] = lesson('a', `<img src=${IMG} alt=a><img alt=b src=${SVG}>`);
  const r = run(repo({ courses: [c] }));
  assert.equal(r.code, 0, r.out);
});

test('an upper-case .SVG is not a diagram, because check:course-diagrams reads only .svg', () => {
  const root = repo();
  write(root, 'public/courses/fix/diagrams/L2.SVG', 'x');
  const c = course();
  c.modules[0].lessons[0] = lesson(
    'a',
    `<img src="${IMG}"><img src="/courses/fix/diagrams/L2.SVG">`
  );
  write(root, 'data/seed/courses-catalog.json', JSON.stringify({ courses: [c] }));
  const r = run(root);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\ba\b.*missing diagram/);
});
