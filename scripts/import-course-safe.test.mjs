#!/usr/bin/env node
/**
 * Learner-progress preservation test for the safe course importer.
 *
 * This is the assertion the whole importer exists for, and it is written as a REGRESSION
 * test against a defect that was measured, not imagined. Against a real Postgres with the
 * real schema, re-running `scripts/seed-courses-catalog.ts` on a course whose content had
 * not changed at all took learner progress from 2 rows to 0 — lesson ids byte-identical
 * before and after, enrolment untouched. The learner stays enrolled while their completion
 * history silently resets.
 *
 * Three things are proved here:
 *   1. A no-op import PRESERVES progress (the defect, fixed).
 *   2. An import that would destroy progress REFUSES without explicit consent, and writes
 *      nothing when it refuses.
 *   3. With consent, it removes exactly the orphaned lesson and its progress, and no more —
 *      the positive control, so the check cannot be satisfied by refusing everything.
 *
 * Needs a disposable database. Skips LOUDLY and non-zero-free when DATABASE_URL is unset so
 * an absent database can never read as a pass:
 *
 *   DATABASE_URL=postgresql://... node scripts/import-course-safe.test.mjs
 */
import { execFileSync } from 'node:child_process';

const SLUG = process.env.TEST_COURSE_SLUG ?? 'introduction-to-air-quality-fundamentals';
const LEARNER = '11111111-1111-1111-1111-111111111111';
const ORPHAN = '99999999-9999-9999-9999-999999999999';

if (!process.env.DATABASE_URL) {
  console.log('SKIPPED (not a pass): DATABASE_URL is unset, so no database was exercised.');
  console.log('  Run against a disposable Postgres with the schema applied:');
  console.log('    DATABASE_URL=postgresql://... node scripts/import-course-safe.test.mjs');
  process.exit(0);
}

const sql = (q) =>
  execFileSync('psql', [process.env.DATABASE_URL, '-tAc', q], { encoding: 'utf8' }).trim();
/** Run the importer with exactly the arguments given — no implicit --slug. */
const importerRaw = (...args) => {
  try {
    return {
      code: 0,
      out: execFileSync('npx', ['tsx', 'scripts/import-course-safe.ts', ...args], {
        encoding: 'utf8',
      }),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};
/**
 * Run the importer scoped to this test's course.
 *
 * NOTE: this injects --slug, so it CANNOT be used for --all cases: the importer refuses
 * --slug and --all together, and a case that expected a refusal would pass for that reason
 * instead of the one it was testing. That happened while writing the --all block below — the
 * assertion went green on "refusing: --slug and --all together" and proved nothing. Use
 * importerRaw for anything whole-catalogue.
 */
const importer = (...args) => importerRaw(`--slug=${SLUG}`, ...args);

const progressForCourse = () =>
  Number(
    sql(`select count(*) from lms_lesson_progress p
         join lms_lessons l on l.id=p.lesson_id
         join lms_modules m on m.id=l.module_id
         join lms_courses c on c.id=m.course_id
         where c.slug='${SLUG}'`)
  );

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.error(`        ${String(detail).trim().split('\n').join('\n        ')}`);
  }
};

// Preconditions: the course must be seeded and the learner must have progress on it.
const lessons = Number(
  sql(`select count(*) from lms_lessons l join lms_modules m on m.id=l.module_id
       join lms_courses c on c.id=m.course_id where c.slug='${SLUG}'`)
);
if (lessons === 0) {
  console.error(`FAIL: course "${SLUG}" has no lessons in this database — seed it first.`);
  process.exit(1);
}
// The learner must exist before any progress row can reference it. Creating it here rather
// than assuming a hand-made fixture is what makes this test runnable on a fresh database.
sql(`insert into lms_users (id, email, hashed_password, full_name, created_at, updated_at)
     values ('${LEARNER}', 'synthetic-learner@example.test',
             '$2b$12$syntheticfixturehashnotarealsecret', 'Synthetic Learner', now(), now())
     on conflict (id) do nothing`);
sql(`delete from lms_lesson_progress where student_id='${LEARNER}'`);
sql(`insert into lms_lesson_progress (id, student_id, lesson_id, completed, last_accessed_at, updated_at)
     select gen_random_uuid(), '${LEARNER}', l.id, true, now(), now()
     from lms_lessons l join lms_modules m on m.id=l.module_id join lms_courses c on c.id=m.course_id
     where c.slug='${SLUG}' order by m.order_index, l.order_index limit 2`);

const before = progressForCourse();
check('fixture: learner has progress', before === 2, `expected 2, got ${before}`);

// 1. A no-op import preserves progress — the defect, fixed.
{
  const { code, out } = importer('--apply');
  const after = progressForCourse();
  check('no-op import exits 0', code === 0, out);
  check(`no-op import PRESERVES progress (${before} -> ${after})`, after === before, out);
}

// 2. A destructive import refuses without consent, and writes nothing.
{
  sql(`insert into lms_lessons (id, module_id, title, content_type, content_body, order_index, is_preview, created_at)
       select '${ORPHAN}', m.id, 'Production-only lesson', 'text', 'x', 99, false, now()
       from lms_modules m join lms_courses c on c.id=m.course_id where c.slug='${SLUG}'
       order by m.order_index limit 1`);
  sql(`insert into lms_lesson_progress (id, student_id, lesson_id, completed, last_accessed_at, updated_at)
       values (gen_random_uuid(), '${LEARNER}', '${ORPHAN}', true, now(), now())`);

  // Snapshot every progress row for this learner before the refused run. Asserting only that
  // the orphan LESSON survives would miss an importer that deleted its PROGRESS and then
  // refused — the later consented import removes that lesson anyway, hiding the write.
  const snapshot = sql(`select p.lesson_id || ':' || p.completed from lms_lesson_progress p
       where p.student_id='${LEARNER}' order by p.lesson_id`);

  const { code, out } = importer('--apply');
  check('destructive import REFUSES', code !== 0, out);
  check(
    'refusal changed no progress row at all',
    sql(`select p.lesson_id || ':' || p.completed from lms_lesson_progress p
         where p.student_id='${LEARNER}' order by p.lesson_id`) === snapshot,
    'progress rows differ before vs immediately after the refused import'
  );
  check('refusal names the progress at risk', /would delete 1 learner progress row/.test(out), out);
  check(
    'refusal does not claim to be applying',
    !/applying \(one transaction\)/.test(out),
    'printed "applying..." before refusing'
  );
  check(
    'refusal wrote nothing',
    Number(sql(`select count(*) from lms_lessons where id='${ORPHAN}'`)) === 1,
    'the orphan lesson was removed despite the refusal'
  );
}

// 3. With consent it removes exactly the orphan — positive control.
{
  const { code, out } = importer('--apply', '--allow-progress-loss');
  check('consented import exits 0', code === 0, out);
  check(
    'orphan lesson removed',
    Number(sql(`select count(*) from lms_lessons where id='${ORPHAN}'`)) === 0,
    out
  );
  check(
    'orphan progress removed',
    Number(sql(`select count(*) from lms_lesson_progress where lesson_id='${ORPHAN}'`)) === 0,
    out
  );
  const survivors = progressForCourse();
  check(`other progress still preserved (${survivors})`, survivors === before, out);
}

// 4. A lesson that MOVES between modules keeps its progress.
//
// Regression test for a Major data-integrity defect found in review: the first version
// deleted obsolete modules BEFORE upserting lessons. A lesson moving from a removed module to
// a surviving one was therefore cascade-deleted (taking its progress) and then recreated
// empty — while planImport reported it as "preserved", because its id appears in both the
// existing and incoming sets. The plan promised 0 rows at risk and destroyed them anyway.
//
// Simulated by moving a catalogue lesson into a DB-only module: the catalogue still claims the
// lesson (so it is retained and reparented), while its current module is absent from the
// catalogue (so it is removed). That is exactly the shape that used to lose progress.
{
  const ORPHAN_MODULE = '88888888-8888-8888-8888-888888888888';
  const movedLesson = sql(`select l.id from lms_lessons l
     join lms_modules m on m.id=l.module_id join lms_courses c on c.id=m.course_id
     where c.slug='${SLUG}' order by m.order_index, l.order_index limit 1`);

  sql(`insert into lms_modules (id, course_id, title, order_index, created_at)
       select '${ORPHAN_MODULE}', c.id, 'DB-only module', 98, now()
       from lms_courses c where c.slug='${SLUG}'`);
  sql(`update lms_lessons set module_id='${ORPHAN_MODULE}' where id='${movedLesson}'`);
  sql(
    `delete from lms_lesson_progress where student_id='${LEARNER}' and lesson_id='${movedLesson}'`
  );
  sql(`insert into lms_lesson_progress (id, student_id, lesson_id, completed, last_accessed_at, updated_at)
       values (gen_random_uuid(), '${LEARNER}', '${movedLesson}', true, now(), now())`);

  const progressBefore = Number(
    sql(`select count(*) from lms_lesson_progress where lesson_id='${movedLesson}'`)
  );
  check('moved-lesson fixture has progress', progressBefore === 1, `got ${progressBefore}`);

  const { code, out } = importer('--apply');
  check('moving a lesson needs no progress-loss consent', code === 0, out);
  check(
    'MOVED lesson KEEPS its progress',
    Number(sql(`select count(*) from lms_lesson_progress where lesson_id='${movedLesson}'`)) === 1,
    'the lesson was cascade-deleted with its old module and recreated empty'
  );
  check(
    'moved lesson was reparented out of the removed module',
    sql(`select count(*) from lms_modules where id='${ORPHAN_MODULE}'`) === '0',
    'the emptied module should have been deleted after the reparent'
  );
}

// 5. An incoming id owned by ANOTHER course is refused outright, in dry run too.
//
// Upserts select by global id and overwrite the parent, so importing course A with one of
// course B's module ids would reparent that module into A — stripping curriculum from a
// course this run never named. There is no consent flag for this: it is always wrong.
{
  const otherSlug = sql(`select slug from lms_courses where slug <> '${SLUG}' limit 1`);
  if (!otherSlug) {
    console.log('  skip  foreign-id guard: only one course in this database');
  } else {
    // Make one of OUR catalogue module ids currently belong to the other course. Planning our
    // import then sees an incoming id owned elsewhere — the exact shape that would silently
    // reparent it. (Re-pointing ownership rather than renaming an id avoids a PK collision.)
    const ours = sql(`select m.id from lms_modules m join lms_courses c on c.id=m.course_id
         where c.slug='${SLUG}' order by m.order_index limit 1`);
    sql(`update lms_modules set course_id=(select id from lms_courses where slug='${otherSlug}')
         where id='${ours}'`);

    const { code, out } = importer();
    check('foreign-id guard refuses in DRY RUN', code !== 0, out);
    check('foreign-id refusal names the id', out.includes(ours), out);
    check(
      'the other course did not lose the module',
      sql(`select c.slug from lms_modules m join lms_courses c on c.id=m.course_id
           where m.id='${ours}'`) === otherSlug,
      'a refused dry run must not move anything'
    );
    sql(`update lms_modules set course_id=(select id from lms_courses where slug='${SLUG}')
         where id='${ours}'`);
  }
}

// 6. WHOLE-CATALOGUE import fails closed: one at-risk course refuses the entire run.
//
// This is the adoption guarantee. db:seed-courses now routes to this importer, so `--all` is
// what CI and operators run against a whole catalogue. It plans every course read-only before
// writing anything, and one blocked course stops the lot -- a half-applied catalogue is worse
// than an unapplied one, and an operator told "course 34 of 80 would destroy progress" after 33
// commits has no clean state to go back to.
{
  const ORPHAN_ALL = '77777777-7777-7777-7777-777777777777';
  sql(`insert into lms_lessons (id, module_id, title, content_type, content_body, order_index,
         is_preview, created_at)
       select '${ORPHAN_ALL}', m.id, 'DB-only lesson for --all', 'text', 'x', 98, false, now()
       from lms_modules m join lms_courses c on c.id=m.course_id where c.slug='${SLUG}'
       order by m.order_index limit 1`);
  sql(`insert into lms_lesson_progress (id, student_id, lesson_id, completed, last_accessed_at,
         updated_at)
       values (gen_random_uuid(), '${LEARNER}', '${ORPHAN_ALL}', true, now(), now())`);

  const snapshot = sql(`select count(*) from lms_lesson_progress where student_id='${LEARNER}'`);
  const { code, out } = importerRaw('--all', '--apply');

  check('--all REFUSES when any course would lose progress', code !== 0, out);
  check('  ...naming the course responsible', out.includes(SLUG), out);
  check(
    '  ...and saying the whole run was refused on purpose',
    /half-applied catalogue is worse/.test(out),
    out
  );
  check(
    '--all wrote nothing for ANY course',
    sql(`select count(*) from lms_lesson_progress where student_id='${LEARNER}'`) === snapshot,
    'progress changed during a refused --all run'
  );
  check(
    '  ...including the orphan it objected to',
    Number(sql(`select count(*) from lms_lessons where id='${ORPHAN_ALL}'`)) === 1,
    'the orphan lesson was removed despite the refusal'
  );

  // Positive control: with the orphan gone there is nothing at risk, so --all must SUCCEED.
  // Without this, "refuses" would also be satisfied by an --all that can never run.
  sql(`delete from lms_lessons where id='${ORPHAN_ALL}'`);
  const ok = importerRaw('--all', '--apply');
  check('control: --all SUCCEEDS once nothing is at risk', ok.code === 0, ok.out);
  check(
    '  ...and preserved the learner progress it was protecting',
    Number(sql(`select count(*) from lms_lesson_progress where student_id='${LEARNER}'`)) > 0,
    'progress vanished during a successful --all run'
  );
}

if (failed > 0) {
  console.error(`\n✖ safe-importer progress-preservation test FAILED — ${failed} assertion(s).`);
  process.exit(1);
}
console.log(
  '\n✓ safe-importer preserves learner progress, refuses loss, and removes only orphans.'
);
process.exit(0);
