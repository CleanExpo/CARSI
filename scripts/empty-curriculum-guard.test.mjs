#!/usr/bin/env node
/**
 * Guard test: a catalogue entry with NO modules must never empty a populated curriculum.
 *
 * WHY THIS EXISTS — measured, not theorised.
 *
 * 34 of the 80 entries in data/seed/courses-catalog.json are metadata-only stubs with zero
 * modules, recorded so the CEC approvals registry can reference them by slug. Three carry an
 * explicit seedWarning that seeding the slug "would replace the course curriculum in the target
 * database with this empty stub".
 *
 * Both import paths deleted that curriculum before this guard existed. Against a real database:
 *
 *   npm run db:seed-courses -- --slug=<stub>
 *     1 module, 2 lessons, 2 progress rows -> 0, 0, 0
 *     and it printed "Seeded course: <slug>" then "Done." — a success message over total loss.
 *
 *   npm run db:import-course -- --slug=<stub> --apply
 *     refused while learner progress existed (the progress guard caught it), but with NO
 *     progress attached it ran clean, printed "curriculum now matches the catalogue", and
 *     deleted 1 module and 2 lessons. The progress guard does not cover curriculum.
 *
 * `--all` walks every entry, so it would do this to all 34 stubs in one run.
 *
 * WHAT IS ASSERTED
 *   1. The legacy seeder refuses a stub slug and writes nothing.
 *   2. The legacy seeder refuses --all when any stub would empty a populated course.
 *   3. The safe importer refuses --apply on a stub with NO learner progress — the case the
 *      progress guard missed.
 *   4. The safe importer WARNS in dry run rather than printing a clean-looking plan.
 *   5. CONTROL: with the stub's curriculum absent (a fresh/CI database), --all still succeeds.
 *      Without this the guard could be "working" by refusing everything, which would break CI.
 *   6. CONTROL: a real course with modules still imports normally.
 *
 * Needs a disposable database. Skips LOUDLY when DATABASE_URL is unset.
 *
 *   DATABASE_URL=postgresql://... node scripts/empty-curriculum-guard.test.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CATALOG = 'data/seed/courses-catalog.json';
const REAL_SLUG = process.env.TEST_COURSE_SLUG ?? 'introduction-to-air-quality-fundamentals';
const MOD = 'aaaaaaaa-0000-0000-0000-0000000000f1';
const L1 = 'aaaaaaaa-0000-0000-0000-0000000000fa';
const L2 = 'aaaaaaaa-0000-0000-0000-0000000000fb';

if (!process.env.DATABASE_URL) {
  console.log('SKIPPED (not a pass): DATABASE_URL is unset, so no database was exercised.');
  console.log('  Run against a disposable Postgres with the schema applied:');
  console.log('    DATABASE_URL=postgresql://... node scripts/empty-curriculum-guard.test.mjs');
  process.exit(0);
}

const URL = process.env.DATABASE_URL;
const sql = (q) => execFileSync('psql', [URL, '-tAc', q], { encoding: 'utf8' }).trim();
const run = (script, ...args) => {
  try {
    return { code: 0, out: execFileSync('npx', ['tsx', script, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};
const seeder = (...a) => run('scripts/seed-courses-catalog.ts', ...a);
const importer = (...a) => run('scripts/import-course-safe.ts', ...a);

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.error(`        ${String(detail).trim().split('\n').join('\n        ')}`);
  }
};

// A genuine metadata-only stub from the real catalogue — not a synthetic one, so this test
// tracks the catalogue as it actually is.
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const stubs = catalog.courses.filter((c) => (c.modules ?? []).length === 0);
if (stubs.length === 0) {
  console.log('SKIPPED (not a pass): the catalogue has no zero-module entries left to test.');
  console.log('  If the stubs were given real curricula, delete this test with them.');
  process.exit(0);
}
const stub = stubs[0];
console.log(`  (${stubs.length} of ${catalog.courses.length} catalogue entries have no modules)`);
console.log(`  using stub: ${stub.slug}`);

const curriculum = () => ({
  modules: Number(
    sql(`select count(*) from lms_modules m join lms_courses c on c.id=m.course_id
         where c.slug='${stub.slug}'`)
  ),
  lessons: Number(
    sql(`select count(*) from lms_lessons l join lms_modules m on m.id=l.module_id
         join lms_courses c on c.id=m.course_id where c.slug='${stub.slug}'`)
  ),
});

/** Give the stub course a populated curriculum, which is what makes it destructible. */
const populate = () => {
  // lms_courses.instructor_id has an enforced FK to lms_users.id and no migration creates that
  // row. Without this the first insert dies of a foreign-key violation on a schema-only
  // database and the test stops before a single guard assertion runs -- it only passed for me
  // because my database happened to be seeded already. Idempotent, so it does not fight the
  // seeder's own upsert of the same instructor.
  sql(`insert into lms_users (id, email, hashed_password, full_name, created_at, updated_at)
       values ('${stub.instructorId}', 'guard-fixture-instructor@example.test',
               '$2b$12$syntheticfixturehashnotarealsecret', 'Guard Fixture Instructor',
               now(), now())
       on conflict (id) do nothing`);
  sql(`insert into lms_courses (id, slug, title, instructor_id, status, price_aud, is_free,
         created_at, updated_at)
       values ('${stub.id}', '${stub.slug}', '${stub.title.replace(/'/g, "''")}',
               '${stub.instructorId}', 'published', 0, true, now(), now())
       on conflict (slug) do nothing`);
  sql(`insert into lms_modules (id, course_id, title, order_index, created_at)
       values ('${MOD}', (select id from lms_courses where slug='${stub.slug}'),
               'Guard fixture module', 1, now())
       on conflict (id) do nothing`);
  sql(`insert into lms_lessons (id, module_id, title, content_type, content_body, order_index,
         is_preview, created_at)
       values ('${L1}', '${MOD}', 'Guard fixture lesson one', 'text', 'body', 1, false, now()),
              ('${L2}', '${MOD}', 'Guard fixture lesson two', 'text', 'body', 2, false, now())
       on conflict (id) do nothing`);
};
const depopulate = () => sql(`delete from lms_modules where id='${MOD}'`);
process.on('exit', depopulate);

// 1 + 2. The legacy seeder refuses, by slug and under --all, and writes nothing.
{
  populate();
  const before = curriculum();
  check(
    'fixture: the stub course has curriculum to lose',
    before.modules === 1 && before.lessons === 2,
    JSON.stringify(before)
  );

  const one = seeder(`--slug=${stub.slug}`);
  check('legacy seeder REFUSES a stub slug', one.code !== 0, one.out);
  check('  ...naming the affected course', one.out.includes(stub.slug), one.out);
  const afterOne = curriculum();
  check(
    'legacy seeder wrote nothing',
    afterOne.modules === before.modules && afterOne.lessons === before.lessons,
    `curriculum changed: ${JSON.stringify(before)} -> ${JSON.stringify(afterOne)}`
  );

  const all = seeder('--all');
  check('legacy seeder REFUSES --all while a stub would empty a course', all.code !== 0, all.out);
  const afterAll = curriculum();
  check(
    '--all wrote nothing',
    afterAll.modules === before.modules && afterAll.lessons === before.lessons,
    `curriculum changed: ${JSON.stringify(before)} -> ${JSON.stringify(afterAll)}`
  );
}

// 3 + 4. The safe importer refuses with NO progress attached — the gap the progress guard left.
{
  sql(`delete from lms_lesson_progress where lesson_id in ('${L1}','${L2}')`);
  const before = curriculum();

  const dry = importer(`--slug=${stub.slug}`);
  check('importer dry run WARNS about emptying the curriculum', /WARNING/.test(dry.out), dry.out);

  const applied = importer(`--slug=${stub.slug}`, '--apply');
  check(
    'importer REFUSES --apply with zero progress (the old gap)',
    applied.code !== 0,
    applied.out
  );
  check(
    '  ...and does not blame progress, which is not what is at stake here',
    /ENTIRE curriculum/.test(applied.out),
    applied.out
  );
  const after = curriculum();
  check(
    'importer wrote nothing',
    after.modules === before.modules && after.lessons === before.lessons,
    `curriculum changed: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`
  );
}

// 5. CONTROL — the guard must NOT fire where nothing is at risk, or it breaks CI's E2E seed.
{
  depopulate();
  const all = seeder('--all');
  check(
    'control: --all still SUCCEEDS when stubs have no curriculum (fresh/CI database)',
    all.code === 0,
    all.out
  );
  check('  ...and seeded the whole catalogue', /Done\. \d+ course\(s\)/.test(all.out), all.out);
}

// 6. CONTROL — a real course with modules is unaffected.
{
  const real = importer(`--slug=${REAL_SLUG}`, '--apply', '--allow-progress-loss');
  check(`control: a real course (${REAL_SLUG}) still imports`, real.code === 0, real.out);
}

if (failed > 0) {
  console.error(`\n✖ empty-curriculum guard test FAILED — ${failed} assertion(s).`);
  console.error('  A failure here means a metadata-only catalogue stub can delete a real');
  console.error('  course curriculum, which is how 34 courses could be emptied in one run.');
  process.exit(1);
}
console.log(
  '\n✓ A zero-module catalogue entry cannot empty a populated curriculum by either path,' +
    '\n  and neither guard fires where there is nothing to lose.'
);
process.exit(0);
