#!/usr/bin/env node
/**
 * Regression test: the default seed path must work on a database that has only ever had
 * migrations applied to it.
 *
 * WHY THIS EXISTS — measured, not theorised.
 *
 * Adopting the safe importer as `db:seed-courses` broke every fresh database, and nothing caught
 * it. `lms_courses.instructor_id` is NOT NULL with a foreign key to `lms_users.id`; no migration
 * creates that row; the legacy seeder bootstrapped it (`ensureInstructors`) and the importer did
 * not. Against a schema-only database with 0 users and 0 courses:
 *
 *   npm run db:seed-courses -- --all --apply
 *     Foreign key constraint violated on the constraint: `lms_courses_instructor_id_fkey`
 *     courses: 0  lessons: 0
 *
 *   ... and then three of the four learner-data-protection suites failed on the empty database.
 *
 * Every other suite in this family runs against an already-seeded database, so every one of them
 * passed while the adoption was broken. The bug was invisible precisely because no test ever
 * exercised the cold-start path — so this test creates its own database and does.
 *
 * WHAT IS ASSERTED
 *   1. A dry run against a schema-only database writes nothing (it now reads lms_users).
 *   2. --all --apply on that database creates the instructor row(s), the courses and the
 *      curriculum.
 *   3. Re-running is idempotent — no duplicate instructor, no error.
 *   4. A single-slug --apply works cold too, not just --all.
 *
 * Needs a disposable Postgres whose user may CREATE DATABASE; it makes and drops its own, so it
 * never touches the database handed to it. Skips LOUDLY when DATABASE_URL is unset.
 *
 *   DATABASE_URL=postgresql://... node scripts/import-course-bootstrap.test.mjs
 */
import { execFileSync } from 'node:child_process';

const SLUG = process.env.TEST_COURSE_SLUG ?? 'introduction-to-air-quality-fundamentals';

if (!process.env.DATABASE_URL) {
  console.log('SKIPPED (not a pass): DATABASE_URL is unset, so no database was exercised.');
  console.log('  Run against a disposable Postgres:');
  console.log('    DATABASE_URL=postgresql://... node scripts/import-course-bootstrap.test.mjs');
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.error(`        ${String(detail).trim().split('\n').join('\n        ')}`);
  }
};

// A disposable database of our own, beside the one we were given. Deriving the URL rather than
// taking a second env var keeps this working unchanged in CI and on a developer's socket.
const base = new URL(process.env.DATABASE_URL);
const given = base.pathname.replace(/^\//, '') || 'postgres';
const COLD = `carsi_coldstart_${process.pid}`;
const admin = new URL(base);
admin.pathname = '/postgres';
const coldUrl = new URL(base);
coldUrl.pathname = `/${COLD}`;

const psql = (url, q) =>
  execFileSync('psql', [String(url), '-tAc', q], { encoding: 'utf8' }).trim();
const n = (q) => Number(psql(coldUrl, q));
const seed = (...args) => {
  try {
    return {
      code: 0,
      out: execFileSync('npx', ['tsx', 'scripts/import-course-safe.ts', ...args], {
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: String(coldUrl), DIRECT_URL: String(coldUrl) },
      }),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

try {
  psql(admin, `create database ${COLD}`);
} catch (e) {
  console.log('SKIPPED (not a pass): could not create a disposable database, so the cold-start');
  console.log('  path was NOT exercised. The DATABASE_URL user needs CREATE DATABASE.');
  console.log(
    `  ${
      String(e.stderr ?? e.message)
        .trim()
        .split('\n')[0]
    }`
  );
  process.exit(0);
}
process.on('exit', () => {
  try {
    psql(admin, `drop database if exists ${COLD} with (force)`);
  } catch {
    /* best effort: a leaked test database is noise, not a failure of the thing under test */
  }
});

console.log(`  cold database: ${COLD}  (the one given to us, ${given}, is left alone)`);
execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
  encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: String(coldUrl), DIRECT_URL: String(coldUrl) },
});

check(
  'fixture: migrations applied and the database is EMPTY',
  n('select count(*) from lms_users') === 0 && n('select count(*) from lms_courses') === 0,
  `users=${n('select count(*) from lms_users')} courses=${n('select count(*) from lms_courses')}`
);

// 1. The dry run reads lms_users now, so prove it still writes nothing.
{
  const dry = seed('--all');
  check('dry run succeeds on a schema-only database', dry.code === 0, dry.out);
  check(
    '  ...and wrote nothing, instructors included',
    n('select count(*) from lms_users') === 0 && n('select count(*) from lms_courses') === 0,
    dry.out
  );
}

// 2. The cold start itself — this is the assertion that was failing before the fix.
{
  const applied = seed('--all', '--apply');
  check('--all --apply SUCCEEDS on a schema-only database', applied.code === 0, applied.out);
  check(
    '  ...having bootstrapped the catalogue instructor(s)',
    n('select count(*) from lms_users') >= 1,
    applied.out
  );
  check(
    '  ...and created courses with curriculum',
    n('select count(*) from lms_courses') > 0 &&
      n('select count(*) from lms_modules') > 0 &&
      n('select count(*) from lms_lessons') > 0,
    `courses=${n('select count(*) from lms_courses')} modules=${n(
      'select count(*) from lms_modules'
    )} lessons=${n('select count(*) from lms_lessons')}`
  );
  check(
    '  ...with every course pointing at a real instructor row',
    n(`select count(*) from lms_courses c
        left join lms_users u on u.id = c.instructor_id where u.id is null`) === 0,
    'some course references an instructor_id with no lms_users row'
  );
}

// 3. Idempotence. A seed step runs on every CI job and every deploy, not once.
{
  const users = n('select count(*) from lms_users');
  const courses = n('select count(*) from lms_courses');
  const again = seed('--all', '--apply');
  check('re-running --all --apply is idempotent', again.code === 0, again.out);
  check(
    '  ...creating no duplicate instructor and no duplicate course',
    n('select count(*) from lms_users') === users &&
      n('select count(*) from lms_courses') === courses,
    `users ${users}->${n('select count(*) from lms_users')}, ` +
      `courses ${courses}->${n('select count(*) from lms_courses')}`
  );
}

// 4. Single-slug cold start. The npm scripts that seed one course (db:seed-floor-care-course,
//    db:import-course) take this path, not --all, and they run on fresh databases too.
{
  psql(coldUrl, 'truncate lms_courses, lms_users cascade');
  check(
    'fixture: emptied again for the single-slug path',
    n('select count(*) from lms_users') === 0 && n('select count(*) from lms_courses') === 0
  );
  const one = seed(`--slug=${SLUG}`, '--apply');
  check(`--slug=${SLUG} --apply SUCCEEDS on a schema-only database`, one.code === 0, one.out);
  check(
    '  ...creating the instructor and exactly that one course',
    n('select count(*) from lms_users') >= 1 && n('select count(*) from lms_courses') === 1,
    one.out
  );
}

if (failed > 0) {
  console.error(`\n✖ cold-start bootstrap test FAILED — ${failed} assertion(s).`);
  console.error('  The default seed path cannot populate a database that has only had migrations');
  console.error('  applied. That breaks every fresh deployment and CI job, as it did once before:');
  console.error('  lms_courses.instructor_id is NOT NULL with an FK to lms_users.id, and no');
  console.error('  migration creates that row — the importer has to bootstrap it.');
  process.exit(1);
}
console.log(
  '\n✓ The default seed path populates a schema-only database, instructor rows included,' +
    '\n  by --all and by --slug, and is idempotent on re-run.'
);
process.exit(0);
