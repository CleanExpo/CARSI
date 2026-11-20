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
const importer = (...args) => {
  try {
    return {
      code: 0,
      out: execFileSync(
        'npx',
        ['tsx', 'scripts/import-course-safe.ts', `--slug=${SLUG}`, ...args],
        {
          encoding: 'utf8',
        }
      ),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

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

  const { code, out } = importer('--apply');
  check('destructive import REFUSES', code !== 0, out);
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

if (failed > 0) {
  console.error(`\n✖ safe-importer progress-preservation test FAILED — ${failed} assertion(s).`);
  process.exit(1);
}
console.log(
  '\n✓ safe-importer preserves learner progress, refuses loss, and removes only orphans.'
);
process.exit(0);
