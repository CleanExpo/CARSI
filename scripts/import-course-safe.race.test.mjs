#!/usr/bin/env node
/**
 * End-to-end concurrent-collision test for the safe course importer.
 *
 * WHAT THIS COVERS THAT THE OTHER TESTS DO NOT
 *
 * `import-course-safe.test.mjs` proves the single-session behaviour, and
 * `import-course-safe.locks.test.mjs` proves the Postgres lock and isolation semantics the guard
 * depends on. Neither drives the REAL importer through a real race, so both were testing a model
 * of the dangerous path rather than the path itself. This file drives the actual CLI.
 *
 * The race: an incoming catalogue id that does NOT exist when `planImport` checks ownership, and
 * which another writer then creates under a DIFFERENT course before the importer's upserts run.
 * `FOR UPDATE` cannot lock a row that does not exist, so no amount of locking reaches this; the
 * importer answers it with a serializable transaction, and this measures that answer.
 *
 * HOW THE WINDOW IS OPENED WITHOUT A PRODUCTION TIMING HOOK
 *
 * A second session holds `FOR UPDATE` on the course row. The importer plans, passes its ownership
 * check, opens its transaction, and then blocks on its own course upsert — which sits after the
 * check and before the module and lesson upserts. That is exactly the window, and it costs the
 * importer nothing: no test-only branch, no env var, no injected delay.
 *
 * EVERY CASE HAS A POSITIVE CONTROL. Before each race, the same import is run with no rival and
 * must SUCCEED and take ownership of the id. Without that, "the importer refused" would also be
 * satisfied by an importer that is simply broken, or by an id that was never importable.
 *
 * Needs a disposable database. Skips LOUDLY when DATABASE_URL is unset so an absent database can
 * never read as a pass. Takes ~30s: it waits on real transactions.
 *
 *   DATABASE_URL=postgresql://... node scripts/import-course-safe.race.test.mjs
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SLUG = process.env.TEST_COURSE_SLUG ?? 'introduction-to-air-quality-fundamentals';
const CATALOG = 'data/seed/courses-catalog.json';

if (!process.env.DATABASE_URL) {
  console.log('SKIPPED (not a pass): DATABASE_URL is unset, so no database was exercised.');
  console.log('  Run against a disposable Postgres with the schema applied:');
  console.log('    DATABASE_URL=postgresql://... node scripts/import-course-safe.race.test.mjs');
  process.exit(0);
}

const URL = process.env.DATABASE_URL;
const sql = (q) => execFileSync('psql', [URL, '-tAc', q], { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.error(`        ${String(detail).trim().split('\n').join('\n        ')}`);
  }
};

/** Run the real CLI to completion. */
const importer = (...args) => {
  try {
    return {
      code: 0,
      out: execFileSync(
        'npx',
        ['tsx', 'scripts/import-course-safe.ts', `--slug=${SLUG}`, ...args],
        { encoding: 'utf8' }
      ),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

/** Start the real CLI without waiting, so a rival can act while it is mid-transaction. */
function importerAsync(...args) {
  const proc = spawn('npx', ['tsx', 'scripts/import-course-safe.ts', `--slug=${SLUG}`, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let exited = null;
  proc.stdout.on('data', (d) => (out += d));
  proc.stderr.on('data', (d) => (out += d));
  proc.on('exit', (c) => (exited = c ?? 1));
  return {
    get out() {
      return out;
    },
    get alive() {
      return exited === null;
    },
    /** Resolve once the CLI prints `marker`, so the race never depends on a guessed sleep. */
    async waitFor(marker, ms = 25000) {
      const deadline = Date.now() + ms;
      while (!out.includes(marker)) {
        if (exited !== null) throw new Error(`importer exited before "${marker}":\n${out}`);
        if (Date.now() > deadline) throw new Error(`"${marker}" never printed:\n${out}`);
        await sleep(150);
      }
    },
    async done(ms = 40000) {
      const deadline = Date.now() + ms;
      while (exited === null) {
        if (Date.now() > deadline) {
          proc.kill('SIGKILL');
          throw new Error(`importer never exited:\n${out}`);
        }
        await sleep(150);
      }
      return { code: exited, out };
    },
  };
}

/** Hold FOR UPDATE on a row until released. */
function holdRowLock(lockSql) {
  const proc = spawn('psql', [URL, '-tA'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let seen = '';
  proc.stdout.on('data', (d) => (seen += d));
  proc.stderr.on('data', (d) => (seen += d));
  proc.stdin.write(`BEGIN;\n${lockSql}\nSELECT 'LOCK-HELD';\n`);
  return {
    async acquired(ms = 15000) {
      const deadline = Date.now() + ms;
      while (!seen.includes('LOCK-HELD')) {
        if (Date.now() > deadline) throw new Error(`course lock never acquired: ${seen}`);
        await sleep(100);
      }
    },
    release() {
      try {
        proc.stdin.write('ROLLBACK;\n');
        proc.stdin.end();
      } catch {
        /* already gone */
      }
      proc.kill('SIGTERM');
    },
  };
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const course = catalog.courses.find((c) => c.slug === SLUG);
if (!course) {
  console.error(`FAIL: slug "${SLUG}" is not in ${CATALOG}`);
  process.exit(1);
}

const ourCourseId = sql(`select id from lms_courses where slug='${SLUG}'`);
const otherCourseId = sql(`select id from lms_courses where slug <> '${SLUG}' limit 1`);
if (!ourCourseId) {
  console.error(`FAIL: course "${SLUG}" is not in this database — seed it first.`);
  process.exit(1);
}
if (!otherCourseId) {
  console.log('SKIPPED (not a pass): only one course in this database, so no rival owner exists.');
  process.exit(0);
}
const otherModuleId = sql(
  `select m.id from lms_modules m where m.course_id='${otherCourseId}' order by m.order_index
   limit 1`
);

/**
 * One race case. `target` describes an incoming catalogue id, how to make it absent, how a rival
 * creates it under the other course, and how to read back who owns it.
 */
async function raceCase(target) {
  console.log(`\n--- ${target.label} ---`);

  // CONTROL. With no rival, the same import must succeed and claim the id. This is what stops a
  // broken importer, or a never-importable id, from satisfying the refusal assertions below.
  target.makeAbsent();
  const control = importer('--apply', '--allow-progress-loss');
  check(`control: import SUCCEEDS with no rival`, control.code === 0, control.out);
  check(
    `control: our course owns the ${target.kind} afterwards`,
    target.ownerOf() === ourCourseId,
    `owner was ${target.ownerOf()}`
  );

  // RACE.
  target.makeAbsent();
  const lock = holdRowLock(`SELECT id FROM lms_courses WHERE id='${ourCourseId}' FOR UPDATE;`);
  let result;
  try {
    await lock.acquired();
    const run = importerAsync('--apply');
    // Wait for the CLI to say it has passed planning and the ownership check and is now inside
    // the transaction, rather than sleeping and hoping.
    await run.waitFor('applying (one transaction)');
    await sleep(1500);
    check(
      'importer is blocked mid-transaction when the rival writes',
      run.alive,
      'it finished first, so the race never happened and the result below is meaningless'
    );
    target.rivalCreates();
    lock.release();
    result = await run.done();
  } finally {
    lock.release();
  }

  check(`race: import REFUSES`, result.code !== 0, result.out);
  check(
    'race: refusal names the serialization abort, not a raw stack trace',
    /could not be serialized/.test(result.out),
    result.out
  );
  check(
    `race: the other course KEEPS the ${target.kind}`,
    target.ownerOf() === otherCourseId,
    `owner is now ${target.ownerOf()} (ours is ${ourCourseId})`
  );

  // Restore: drop the rival row and let a clean import rebuild the curriculum.
  target.cleanup();
  const restore = importer('--apply', '--allow-progress-loss');
  check('restored: a clean import succeeds afterwards', restore.code === 0, restore.out);
}

// Module id absent at plan time, created by a rival under the other course.
const mod = course.modules[course.modules.length - 1];
await raceCase({
  kind: 'module',
  label: `module id absent at plan time (${mod.id})`,
  makeAbsent: () => sql(`delete from lms_modules where id='${mod.id}'`),
  rivalCreates: () =>
    sql(`insert into lms_modules (id, course_id, title, order_index, created_at)
         values ('${mod.id}', '${otherCourseId}', 'rival module', 95, now())`),
  ownerOf: () => sql(`select course_id from lms_modules where id='${mod.id}'`),
  cleanup: () => sql(`delete from lms_modules where id='${mod.id}'`),
});

// Lesson id absent at plan time, created by a rival under a module of the other course.
const les = mod.lessons[mod.lessons.length - 1];
if (!otherModuleId) {
  console.log('\n  skip  lesson-id race: the other course has no module to hang a rival lesson on');
} else {
  await raceCase({
    kind: 'lesson',
    label: `lesson id absent at plan time (${les.id})`,
    makeAbsent: () => sql(`delete from lms_lessons where id='${les.id}'`),
    rivalCreates: () =>
      sql(`insert into lms_lessons (id, module_id, title, content_type, content_body,
             order_index, is_preview, created_at)
           values ('${les.id}', '${otherModuleId}', 'rival lesson', 'text', 'x', 95, false,
                   now())`),
    // Ownership of a lesson is its module's course, which is the rule the importer enforces.
    ownerOf: () =>
      sql(`select m.course_id from lms_lessons l join lms_modules m on m.id=l.module_id
           where l.id='${les.id}'`),
    cleanup: () => sql(`delete from lms_lessons where id='${les.id}'`),
  });
}

if (failed > 0) {
  console.error(`\n✖ concurrent-collision test FAILED — ${failed} assertion(s).`);
  console.error('  A failure here means an import can take curriculum from a course it never');
  console.error('  named, which is the harm the ownership guard exists to prevent.');
  process.exit(1);
}
console.log(
  '\n✓ An incoming id created under another course mid-import aborts the transaction;' +
    '\n  the other course keeps its row, and a clean import still succeeds.'
);
process.exit(0);
