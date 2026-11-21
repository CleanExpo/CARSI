#!/usr/bin/env node
/**
 * Non-vacuity proof for the IICRC scope guard (scripts/check-iicrc-scope.mjs, Linear GP-748).
 *
 * A small fixture repository is built in a temp folder: one CEC-approved course and one course
 * that is not approved, each with a catalogue entry, a quiz file, an assessment, a flashcard deck,
 * a draft folder, public course files and an SEO card, all clean. Then:
 *   - the clean fixture passes (exit 0) and the CLI says so;
 *   - every learner-facing surface of the non-approved course, planted with one banned form,
 *     fails and the finding names the file, the course and the field;
 *   - the same plants inside the approved course pass (approved courses are out of scope);
 *   - plants in internal fields (meta.draftNote, a file note, a question's sourceRef, a research
 *     pack) pass, which documents the boundary the header declares;
 *   - an unknown field, an unknown data/seed file, unreadable JSON, an empty approvals registry
 *     and an unresolvable course slug all fail closed;
 *   - the real repository is read at full scope (scope floor), so a guard that scans nothing fails.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { evaluate, scopeHits } from './check-iicrc-scope.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = join(REPO, 'scripts/check-iicrc-scope.mjs');
const OK = 'approved-course';
const NO = 'plain-course';

function lesson(id) {
  return { id, title: 'Read the room', contentType: 'text', contentBody: '<p>Measure the room in metres.</p>', orderIndex: 0, isPreview: false, resources: [{ label: 'Safe Work Australia', url: 'https://www.safeworkaustralia.gov.au/' }] };
}

function course(slug) {
  return {
    id: `id-${slug}`, slug, title: 'A CARSI course', description: '<p>A CARSI course.</p>', shortDescription: 'CARSI.',
    thumbnailUrl: null, instructorId: 'i', status: 'published', priceAud: '0', isFree: true, durationHours: 1,
    level: 'L1-foundation', category: 'Water', tags: ['water'], iicrcDiscipline: null, cecHours: 0,
    meta: { cecStatus: 'No CEC hours.', draftNote: 'internal' }, isPublished: true,
    modules: [{ id: `m-${slug}`, title: 'Module 1', orderIndex: 0, lessons: [lesson(`l-${slug}`)] }],
  };
}

function quiz(slug) {
  return {
    version: 1, courseSlug: slug, note: 'internal note', disclaimer: 'This is a CARSI course and a CARSI credential.',
    quizzes: [{ quizId: 'q1', title: 'Check', lessonTitle: 'Read the room', passPercentage: 80, attemptsAllowed: 3,
      questions: [{ questionText: 'How big is the room?', options: ['2 m', '3 m'], correctIndex: 0, points: 1, explanation: 'Measure it.', sourceRef: 'lesson 1' }] }],
  };
}

function assessment(slug) {
  return { version: 1, courseSlug: slug, note: 'internal', assessment: { id: 'a1', title: 'Practical', instructions: 'Do it.', isPublished: false, passThreshold: 70, criteria: [{ label: 'Scope', description: 'Measured in metres.' }] } };
}

function card(slug) {
  return { slug, seoTitle: 'A CARSI course', faq: [{ q: 'Is this a CARSI course?', a: 'Yes.' }] };
}

/** Write a clean fixture repository; `mutate` edits the in-memory files first. */
function fixture(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'iicrc-scope-'));
  const files = {
    'data/seed/cec-approvals.json': { approvals: [{ slug: OK, status: 'approved' }, { slug: 'submitted-course', status: 'submitted' }] },
    'data/seed/courses-catalog.json': { version: 1, courses: [course(OK), course(NO)] },
    [`data/seed/${OK}-quiz.json`]: quiz(OK),
    [`data/seed/${NO}-quiz.json`]: quiz(NO),
    [`data/seed/${NO}-assessment.json`]: assessment(NO),
    [`data/seed/${OK}-assessment.json`]: assessment(OK),
    [`data/seed/assessment-drafts/${NO}.quizzes.json`]: quiz(NO),
    [`data/seed/flashcards/${NO}.json`]: { courseSlug: NO, decks: [{ module: 'Module 1', cards: [{ front: 'Q', back: 'A' }] }] },
    [`data/courses/${NO}/v1-draft/courses-catalog.json`]: { version: 1, courses: [course(NO)] },
    [`data/courses/${NO}/v1-draft/${NO}-quiz.json`]: quiz(NO),
    [`data/courses/${NO}/v1-draft/research-pack.md`]: 'Research notes.\n',
    [`data/courses/${NO}/v1/courses-catalog.json`]: { version: 1, courses: [course(NO)] },
    [`data/seo/course-cards/${NO}.json`]: card(NO),
    [`data/seo/course-cards/${OK}.json`]: card(OK),
    'data/seo/course-cards.index.json': { [NO]: card(NO), [OK]: card(OK) },
    [`public/courses/${NO}/field-tools/card.md`]: '# Field card\n\nMeasure in metres.\n',
    [`public/courses/${NO}/diagrams/map.svg`]: '<svg><text>Room map</text></svg>\n',
    [`public/courses/${NO}/course.pdf`]: '%PDF-1.4 binary',
    [`public/courses/${OK}/field-tools/card.md`]: '# Field card\n',
  };
  mutate(files);
  for (const [path, body] of Object.entries(files)) {
    if (body === undefined) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof body === 'string' ? body : JSON.stringify(body, null, 1));
  }
  return root;
}

function findingsFor(mutate) {
  const root = fixture(mutate);
  try {
    return evaluate(root).findings;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const cat = (f) => f['data/seed/courses-catalog.json'].courses.find((c) => c.slug === NO);
const catOk = (f) => f['data/seed/courses-catalog.json'].courses.find((c) => c.slug === OK);

test('the clean fixture passes, through the CLI as well', () => {
  assert.deepEqual(findingsFor(), []);
  const root = fixture();
  try {
    const run = spawnSync(process.execPath, [GUARD, `--root=${root}`], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /IICRC scope guard passed/);
    assert.match(run.stdout, /NOT INSPECTED.*course\.pdf/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const SURFACES = [
  ['lesson body', (f) => { cat(f).modules[0].lessons[0].contentBody = '<p>Aligned to the principles in ANSI/IICRC S500:2025.</p>'; }, 'data/seed/courses-catalog.json', 'contentBody'],
  ['description, negative disclaimer', (f) => { cat(f).description = '<p>This course is not IICRC certification.</p>'; }, 'data/seed/courses-catalog.json', 'description'],
  ['short description, bare standard number', (f) => { cat(f).shortDescription = 'Follows S520.'; }, 'data/seed/courses-catalog.json', 'shortDescription'],
  ['tag, certification acronym', (f) => { cat(f).tags.push('WRT'); }, 'data/seed/courses-catalog.json', 'tags'],
  ['module title', (f) => { cat(f).modules[0].title = 'Module 1: S700 basics'; }, 'data/seed/courses-catalog.json', 'modules[0].title'],
  ['lesson title', (f) => { cat(f).modules[0].lessons[0].title = 'The S-540 standard'; }, 'data/seed/courses-catalog.json', 'lessons[0].title'],
  ['resource link', (f) => { cat(f).modules[0].lessons[0].resources[0].url = 'https://iicrc.org/standards/iicrc-s100/'; }, 'data/seed/courses-catalog.json', 'resources[0].url'],
  ['learner meta', (f) => { cat(f).meta.cecStatus = 'No IICRC CEC.'; }, 'data/seed/courses-catalog.json', 'meta.cecStatus'],
  ['HTML-escaped name', (f) => { cat(f).modules[0].lessons[0].contentBody = '<p>I&#73;CRC rules.</p>'; }, 'data/seed/courses-catalog.json', 'contentBody'],
  ['name spelled out', (f) => { cat(f).description = 'The Institute of Inspection, Cleaning and Restoration Certification says so.'; }, 'data/seed/courses-catalog.json', 'description'],
  ['IICRC discipline field', (f) => { cat(f).iicrcDiscipline = 'WRT'; }, 'data/seed/courses-catalog.json', 'iicrcDiscipline'],
  ['quiz question', (f) => { f[`data/seed/${NO}-quiz.json`].quizzes[0].questions[0].questionText = 'Under S 500, how big is the room?'; }, `data/seed/${NO}-quiz.json`, 'questionText'],
  ['quiz option', (f) => { f[`data/seed/${NO}-quiz.json`].quizzes[0].questions[0].options[1] = 'IICRC certification'; }, `data/seed/${NO}-quiz.json`, 'options[1]'],
  ['quiz explanation', (f) => { f[`data/seed/${NO}-quiz.json`].quizzes[0].questions[0].explanation = 'The ASD course says so.'; }, `data/seed/${NO}-quiz.json`, 'explanation'],
  ['quiz title', (f) => { f[`data/seed/${NO}-quiz.json`].quizzes[0].title = 'S500 check'; }, `data/seed/${NO}-quiz.json`, 'quizzes[0].title'],
  ['assessment criterion', (f) => { f[`data/seed/${NO}-assessment.json`].assessment.criteria[0].description = 'Meets the IICRC benchmark.'; }, `data/seed/${NO}-assessment.json`, 'criteria'],
  ['assessment-draft disclaimer', (f) => { f[`data/seed/assessment-drafts/${NO}.quizzes.json`].disclaimer = 'Not IICRC certification.'; }, `data/seed/assessment-drafts/${NO}.quizzes.json`, 'disclaimer'],
  ['flashcard', (f) => { f[`data/seed/flashcards/${NO}.json`].decks[0].cards[0].back = 'ANSI/IICRC S100.'; }, `data/seed/flashcards/${NO}.json`, 'back'],
  ['draft catalogue', (f) => { f[`data/courses/${NO}/v1-draft/courses-catalog.json`].courses[0].description = 'Aligned to S520.'; }, `data/courses/${NO}/v1-draft/courses-catalog.json`, 'description'],
  ['draft quiz', (f) => { f[`data/courses/${NO}/v1-draft/${NO}-quiz.json`].quizzes[0].questions[0].options[0] = 'AMRT'; }, `data/courses/${NO}/v1-draft/${NO}-quiz.json`, 'options[0]'],
  ['v1 folder catalogue', (f) => { f[`data/courses/${NO}/v1/courses-catalog.json`].courses[0].title = 'FSRT workshop'; }, `data/courses/${NO}/v1/courses-catalog.json`, 'title'],
  ['draft markdown copy', (f) => { f[`data/courses/${NO}/v1-draft/handout.md`] = 'See the IICRC.\n'; }, `data/courses/${NO}/v1-draft/handout.md`, '(file)'],
  ['field tool', (f) => { f[`public/courses/${NO}/field-tools/card.md`] += 'Per S500 section 12.\n'; }, `public/courses/${NO}/field-tools/card.md`, '(file)'],
  ['diagram', (f) => { f[`public/courses/${NO}/diagrams/map.svg`] = '<svg><text>IICRC</text></svg>'; }, `public/courses/${NO}/diagrams/map.svg`, '(file)'],
  ['SEO course card', (f) => { f[`data/seo/course-cards/${NO}.json`].faq[0].a = 'It does not award IICRC CECs.'; }, `data/seo/course-cards/${NO}.json`, 'faq'],
  ['SEO card index entry', (f) => { f['data/seo/course-cards.index.json'][NO].seoTitle = 'IICRC course'; }, 'data/seo/course-cards.index.json', 'seoTitle'],
];

for (const [name, mutate, file, field] of SURFACES) {
  test(`non-approved course, ${name}: fails and names file, course and field`, () => {
    const findings = findingsFor(mutate);
    assert.ok(findings.length > 0, `${name} was not caught`);
    const hit = findings.find((x) => x.startsWith(`${file} :: ${NO} :: `) && x.includes(field));
    assert.ok(hit, `${name}: no finding for ${file} / ${field}; got:\n${findings.join('\n')}`);
  });
}

test('the CLI exits 1 on a planted hit and prints the finding', () => {
  const root = fixture((f) => { cat(f).description = 'Aligned to ANSI/IICRC S500.'; });
  try {
    const run = spawnSync(process.execPath, [GUARD, `--root=${root}`], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /data\/seed\/courses-catalog\.json :: plain-course :: courses\[1\]\.description :: IICRC/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the same plants inside the CEC-approved course pass (out of scope)', () => {
  const findings = findingsFor((f) => {
    catOk(f).description = 'Aligned to ANSI/IICRC S500:2025. Earns IICRC CECs. WRT.';
    catOk(f).modules[0].lessons[0].contentBody = '<p>S520 section 9.</p>';
    f[`data/seed/${OK}-quiz.json`].quizzes[0].questions[0].questionText = 'What does IICRC S500 say?';
    f[`data/seed/${OK}-assessment.json`].assessment.instructions = 'Follow the IICRC.';
    f[`public/courses/${OK}/field-tools/card.md`] = 'IICRC S500.\n';
    f[`data/seo/course-cards/${OK}.json`].faq[0].a = 'Yes, it earns IICRC CECs.';
    f['data/seo/course-cards.index.json'][OK].seoTitle = 'IICRC CEC course';
  });
  assert.deepEqual(findings, []);
});

test('internal fields are outside the scope, as the header declares', () => {
  const findings = findingsFor((f) => {
    cat(f).meta.draftNote = 'IICRC S500 cited before GP-748.';
    cat(f).meta.durationNote = 'IICRC contact hour.';
    f[`data/seed/${NO}-quiz.json`].note = 'IICRC';
    f[`data/seed/${NO}-quiz.json`].quizzes[0].questions[0].sourceRef = 'ANSI/IICRC S500';
    f[`data/courses/${NO}/v1-draft/research-pack.md`] = 'ANSI/IICRC S500 notes.\n';
  });
  assert.deepEqual(findings, []);
});

test('ordinary words and the listed product name are not acronym hits; the bare code is', () => {
  assert.deepEqual(scopeHits('Booked for 3 Oct, check BMI'), []);
  assert.deepEqual(scopeHits('HydraMaster CDS xDrive truckmount'), []);
  assert.deepEqual(scopeHits('Earn your CDS'), ['IICRC certification acronym']);
  assert.deepEqual(scopeHits('AS/NZS 3500 plumbing'), []);
});

test('fails closed: unknown field, unknown seed file, unreadable JSON, empty registry, unresolved slug', () => {
  const unknownField = findingsFor((f) => { cat(f).modules[0].lessons[0].transcript = 'x'; });
  assert.ok(unknownField.some((x) => x.includes('lessons[0].transcript') && x.includes('unclassified field')), unknownField.join('\n'));

  const unknownFile = findingsFor((f) => { f['data/seed/new-registry.json'] = { rows: [] }; });
  assert.ok(unknownFile.some((x) => x.startsWith('data/seed/new-registry.json') && x.includes('not a course file')), unknownFile.join('\n'));

  const unreadable = findingsFor((f) => { f[`data/seed/${NO}-quiz.json`] = '{ not json'; });
  assert.ok(unreadable.some((x) => x.includes('unreadable JSON')), unreadable.join('\n'));

  const empty = findingsFor((f) => { f['data/seed/cec-approvals.json'] = { approvals: [] }; });
  assert.ok(empty.some((x) => x.includes('no approved slug read')), empty.join('\n'));

  const noCatalogue = findingsFor((f) => { f['data/seed/courses-catalog.json'] = { version: 1, courses: [] }; });
  assert.ok(noCatalogue.some((x) => x.includes('refusing to pass')), noCatalogue.join('\n'));

  // A submitted (not approved) course and a slug no registry knows are both scanned.
  const unresolved = findingsFor((f) => {
    f['data/seed/mystery-quiz.json'] = { ...quiz('mystery-course'), disclaimer: 'Not IICRC certification.' };
    f['data/seed/submitted-course-quiz.json'] = { ...quiz('submitted-course'), disclaimer: 'Aligned to S500.' };
  });
  assert.ok(unresolved.some((x) => x.includes(':: mystery-course ::')), unresolved.join('\n'));
  assert.ok(unresolved.some((x) => x.includes(':: submitted-course ::')), unresolved.join('\n'));
});

test('reads the real repository at full scope (scope floor)', () => {
  const { stats } = evaluate(REPO);
  assert.ok(stats.courses.size >= 40, `only ${stats.courses.size} non-approved courses scanned`);
  assert.ok(stats.approvedSkipped.size >= 38, `only ${stats.approvedSkipped.size} approved courses seen`);
  assert.ok(stats.surfaces >= 2000, `only ${stats.surfaces} surfaces scanned`);
});

// ── PR #1205 review (CodeRabbit): forms of a hit the reader sees but the first guard missed ──
// One owner (readerViews) builds every view; these pin each form so the class cannot return.
test('a lowercase standard number is a hit (s500:2025 names the standard)', () => {
  assert.deepEqual(scopeHits('Refer to s500:2025.'), ['IICRC standard number']);
  assert.deepEqual(scopeHits('Refer to s-520.'), ['IICRC standard number']);
  const found = findingsFor((f) => { cat(f).shortDescription = 'Refer to s500:2025.'; });
  assert.ok(found.some((x) => x.includes('shortDescription') && x.includes('IICRC standard number')), found.join('\n'));
});

test('a name split by inline markup is a hit; block markup keeps words apart', () => {
  assert.deepEqual(scopeHits('<p>ii<strong>crc</strong></p>'), ['IICRC']);
  assert.deepEqual(scopeHits('<p>See <em>S</em>500 here</p>'), ['IICRC standard number']);
  assert.deepEqual(scopeHits('<p>II</p><p>CRC</p>'), []);
  const found = findingsFor((f) => { cat(f).modules[0].lessons[0].contentBody = '<p>ii<strong>crc</strong></p>'; });
  assert.ok(found.some((x) => x.includes('contentBody')), found.join('\n'));
});

test('an SEO index entry is scanned even when its course has no standalone card', () => {
  const found = findingsFor((f) => {
    f[`data/seo/course-cards/${NO}.json`] = undefined;
    f['data/seo/course-cards.index.json'][NO].seoTitle = 'IICRC course';
  });
  assert.ok(found.some((x) => x.startsWith('data/seo/course-cards.index.json') && x.includes('IICRC')), found.join('\n'));
  // A legacy index entry (slug in no catalogue) stays out of scope and is counted, as documented.
  const root = fixture((f) => { f['data/seo/course-cards.index.json']['legacy-only'] = { seoTitle: 'IICRC legacy' }; });
  try {
    const { findings, stats } = evaluate(root);
    assert.deepEqual(findings, []);
    assert.equal(stats.legacyIndexEntries, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a relative --root reads the same files as an absolute one', () => {
  const root = fixture();
  try {
    const run = spawnSync(process.execPath, [GUARD, '--root=.'], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /IICRC scope guard passed/);
    // The exported evaluate() resolves a relative root itself, so a programmatic caller is safe too.
    assert.deepEqual(evaluate(relative(process.cwd(), root)).findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a course that names a standard may not declare "None named." in meta.standardsReferenced', () => {
  const plant = (f, c) => {
    c.meta = { ...(c.meta ?? {}), standardsReferenced: 'None named.' };
    c.modules[0].lessons[0].contentBody = '<p>Test and tag to AS/NZS 3760.</p>';
  };
  const found = findingsFor((f) => plant(f, cat(f)));
  assert.ok(found.some((x) => x.includes('meta.standardsReferenced') && x.includes('AS/NZS 3760')), found.join('\n'));
  assert.deepEqual(findingsFor((f) => { plant(f, cat(f)); cat(f).meta.standardsReferenced = 'Nominative only (AS/NZS 3760).'; }), []);
  assert.deepEqual(findingsFor((f) => { cat(f).meta = { standardsReferenced: 'None named.' }; }), []);
});
