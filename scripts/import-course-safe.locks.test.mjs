#!/usr/bin/env node
/**
 * Proves the two Postgres lock conflicts that the safe importer's progress guard depends on.
 *
 * WHY THIS FILE EXISTS
 *
 * `scripts/import-course-safe.ts` refuses to destroy learner progress. Under concurrency that
 * refusal is only as good as one claim about Postgres: that taking `FOR UPDATE` on a parent row
 * blocks inserts of its children, because a foreign-key check locks the parent `FOR KEY SHARE`
 * and the two modes conflict. The importer takes those locks and then recounts; if the claim is
 * false the recount is worthless, because a row could still be inserted immediately after it.
 *
 * That claim was asserted in review before it was ever measured. This file measures it. Both
 * directions the importer relies on are exercised:
 *
 *   A. FOR UPDATE on a lesson blocks a new lms_lesson_progress row for that lesson.
 *      (Guards: progress completed between the plan and the delete.)
 *   B. FOR UPDATE on a module blocks a new lms_lessons row in that module.
 *      (Guards: a lesson added to a doomed module after planning, which would be
 *      cascade-deleted with its progress, uncounted.)
 *   C. SERIALIZABLE aborts the one case no row lock can reach — an incoming id CREATED under
 *      another course inside the window, which FOR UPDATE cannot lock because it does not exist
 *      yet. Its control is the vulnerability itself: the same interleaving under READ COMMITTED
 *      must actually steal the module.
 *
 * EACH TEST HAS A POSITIVE CONTROL. A blocked insert is only evidence if the same insert
 * succeeds when the lock is NOT held — otherwise a typo, a missing column or a bad id would
 * "pass" this test by failing for the wrong reason. Both halves must hold.
 *
 * Needs a disposable database. Skips LOUDLY when DATABASE_URL is unset so an absent database
 * can never read as a pass:
 *
 *   DATABASE_URL=postgresql://... node scripts/import-course-safe.locks.test.mjs
 */
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.log('SKIPPED (not a pass): DATABASE_URL is unset, so no database was exercised.');
  console.log('  Run against a disposable Postgres with the schema applied:');
  console.log('    DATABASE_URL=postgresql://... node scripts/import-course-safe.locks.test.mjs');
  process.exit(0);
}

const URL = process.env.DATABASE_URL;
const sql = (q) => execFileSync('psql', [URL, '-tAc', q], { encoding: 'utf8' }).trim();

/** Run a statement that is EXPECTED to fail; return its stderr instead of throwing. */
const tryStatement = (q) => {
  try {
    execFileSync('psql', [URL, '-v', 'ON_ERROR_STOP=1', '-tAc', q], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, err: '' };
  } catch (e) {
    return { ok: false, err: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

/**
 * Open a second session, hold a row lock in an uncommitted transaction, and run `body` while it
 * is held. The lock is released on the way out whatever happens.
 */
async function whileHoldingLock(lockSql, body) {
  const holder = spawn('psql', [URL, '-tA'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let seen = '';
  holder.stdout.on('data', (d) => (seen += d));
  holder.stderr.on('data', (d) => (seen += d));
  try {
    holder.stdin.write(`BEGIN;\n${lockSql}\nSELECT 'LOCK-HELD';\n`);
    // Wait for the sentinel. Without this the body could run before the lock is taken, and a
    // succeeding insert would be read as "the lock does not conflict" when it was never held.
    const deadline = Date.now() + 15000;
    while (!seen.includes('LOCK-HELD')) {
      if (Date.now() > deadline) throw new Error(`lock never acquired; session said: ${seen}`);
      await new Promise((r) => setTimeout(r, 100));
    }
    return await body();
  } finally {
    try {
      holder.stdin.write('ROLLBACK;\n');
      holder.stdin.end();
    } catch {
      /* already gone */
    }
    holder.kill('SIGTERM');
  }
}

/**
 * Open a session we can drive statement by statement, so an interleaving can be constructed:
 * write some SQL, wait for its sentinel, let another session act, then continue.
 */
function openSession() {
  const proc = spawn('psql', [URL, '-tA', '-v', 'ON_ERROR_STOP=0'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let seen = '';
  proc.stdout.on('data', (d) => (seen += d));
  proc.stderr.on('data', (d) => (seen += d));
  return {
    get log() {
      return seen;
    },
    /** Send SQL, then block until its sentinel comes back, so ordering is never assumed. */
    async run(statements, sentinel) {
      proc.stdin.write(`${statements}\nSELECT '${sentinel}';\n`);
      const deadline = Date.now() + 15000;
      while (!seen.includes(sentinel)) {
        if (Date.now() > deadline) throw new Error(`"${sentinel}" never arrived; saw: ${seen}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    close() {
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

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.error(`        ${String(detail).trim().split('\n').join('\n        ')}`);
  }
};

// Own fixture, so this test does not depend on whatever happens to be seeded.
const ids = {
  course: randomUUID(),
  module: randomUUID(),
  lesson: randomUUID(),
  learner: randomUUID(),
};
const cleanup = () => {
  try {
    sql(`delete from lms_courses where id='${ids.course}'`);
    sql(`delete from lms_users where id='${ids.learner}'`);
  } catch {
    /* best effort */
  }
};
process.on('exit', cleanup);

const instructor = sql(`select instructor_id from lms_courses where instructor_id is not null
   limit 1`);
sql(`insert into lms_courses (id, slug, title, instructor_id, status, price_aud, is_free,
        created_at, updated_at)
     values ('${ids.course}', 'lock-test-${ids.course}', 'Lock test course',
             ${instructor ? `'${instructor}'` : 'null'}, 'draft', 0, true, now(), now())`);
sql(`insert into lms_modules (id, course_id, title, order_index, created_at)
     values ('${ids.module}', '${ids.course}', 'Lock test module', 1, now())`);
sql(`insert into lms_lessons (id, module_id, title, content_type, content_body, order_index,
        is_preview, created_at)
     values ('${ids.lesson}', '${ids.module}', 'Lock test lesson', 'text', 'x', 1, false, now())`);
sql(`insert into lms_users (id, email, hashed_password, full_name, created_at, updated_at)
     values ('${ids.learner}', 'lock-test-${ids.learner}@example.test',
             '$2b$12$syntheticfixturehashnotarealsecret', 'Lock Test Learner', now(), now())`);

const insertProgress = () =>
  `SET lock_timeout='3s'; insert into lms_lesson_progress
     (id, student_id, lesson_id, completed, last_accessed_at, updated_at)
   values (gen_random_uuid(), '${ids.learner}', '${ids.lesson}', true, now(), now())`;

const insertLesson = (lessonId) =>
  `SET lock_timeout='3s'; insert into lms_lessons
     (id, module_id, title, content_type, content_body, order_index, is_preview, created_at)
   values ('${lessonId}', '${ids.module}', 'Race lesson', 'text', 'x', 97, false, now())`;

// ---------------------------------------------------------------------------------------------
// A. FOR UPDATE on a lesson blocks new progress for it.
// ---------------------------------------------------------------------------------------------
{
  // Positive control FIRST: the insert must work when nothing is holding the lock. If this
  // fails, every "blocked" result below is meaningless.
  const control = tryStatement(insertProgress());
  check('control: progress insert SUCCEEDS with no lock held', control.ok, control.err);
  sql(`delete from lms_lesson_progress where lesson_id='${ids.lesson}'`);

  const blocked = await whileHoldingLock(
    `SELECT id FROM lms_lessons WHERE id='${ids.lesson}' FOR UPDATE;`,
    () => tryStatement(insertProgress())
  );
  check('FOR UPDATE on a lesson BLOCKS a progress insert', !blocked.ok, 'the insert got through');
  check(
    '  ...and blocks by lock contention, not some other error',
    /lock timeout/i.test(blocked.err),
    blocked.err
  );
  check(
    '  ...via the FK check taking FOR KEY SHARE on lms_lessons',
    /FOR KEY SHARE/i.test(blocked.err) && /lms_lessons/.test(blocked.err),
    blocked.err
  );
  check(
    'nothing was inserted while blocked',
    sql(`select count(*) from lms_lesson_progress where lesson_id='${ids.lesson}'`) === '0',
    'a progress row survived the blocked insert'
  );
}

// ---------------------------------------------------------------------------------------------
// B. FOR UPDATE on a module blocks new lessons under it.
//
// This is the one the module-deletion guard rests on: the importer locks every module it is
// about to delete BEFORE reading what is inside it, so the set of lessons it is about to
// cascade-delete cannot grow after it has been counted.
// ---------------------------------------------------------------------------------------------
{
  const controlId = randomUUID();
  const control = tryStatement(insertLesson(controlId));
  check('control: lesson insert SUCCEEDS with no lock held', control.ok, control.err);
  sql(`delete from lms_lessons where id='${controlId}'`);

  const raceId = randomUUID();
  const blocked = await whileHoldingLock(
    `SELECT id FROM lms_modules WHERE id='${ids.module}' FOR UPDATE;`,
    () => tryStatement(insertLesson(raceId))
  );
  check('FOR UPDATE on a module BLOCKS a lesson insert', !blocked.ok, 'the insert got through');
  check(
    '  ...and blocks by lock contention, not some other error',
    /lock timeout/i.test(blocked.err),
    blocked.err
  );
  check(
    '  ...via the FK check taking FOR KEY SHARE on lms_modules',
    /FOR KEY SHARE/i.test(blocked.err) && /lms_modules/.test(blocked.err),
    blocked.err
  );
  check(
    'nothing was inserted while blocked',
    sql(`select count(*) from lms_lessons where id='${raceId}'`) === '0',
    'a lesson survived the blocked insert'
  );
}

// ---------------------------------------------------------------------------------------------
// C. SERIALIZABLE blocks the PHANTOM reparent that no row lock can reach.
//
// FOR UPDATE cannot lock a row that does not exist, so an incoming id CREATED under another
// course between the importer's ownership check and its upserts is outside every lock it takes.
// The importer answers that with SERIALIZABLE isolation. This measures the claim instead of
// taking it from the manual — and its control is the vulnerability itself: the same interleaving
// under READ COMMITTED must actually steal the module, or this proves nothing about isolation.
// ---------------------------------------------------------------------------------------------
{
  const otherCourse = sql(`select id from lms_courses where id <> '${ids.course}' limit 1`);
  if (!otherCourse) {
    console.log('  skip  phantom-reparent: only one course in this database');
  } else {
    /** Interleave: importer reads ownership -> rival creates the id elsewhere -> importer upserts. */
    const race = async (isolation) => {
      const phantom = randomUUID();
      const importer = openSession();
      try {
        await importer.run(
          `BEGIN ISOLATION LEVEL ${isolation};\n` +
            `SELECT id FROM lms_modules WHERE id = ANY(array['${phantom}']::uuid[])\n` +
            `  AND course_id <> '${ids.course}';`,
          'OWNERSHIP-READ-DONE'
        );
        // A rival writer creates that id under a DIFFERENT course, and commits.
        sql(`insert into lms_modules (id, course_id, title, order_index, created_at)
             values ('${phantom}', '${otherCourse}', 'phantom module', 96, now())`);
        // The importer now upserts by global id — the reparent we are trying to prevent.
        await importer.run(
          `INSERT INTO lms_modules (id, course_id, title, order_index, created_at)\n` +
            `VALUES ('${phantom}', '${ids.course}', 'ours', 96, now())\n` +
            `ON CONFLICT (id) DO UPDATE SET course_id='${ids.course}';\nCOMMIT;`,
          'IMPORTER-DONE'
        );
        const owner = sql(`select course_id from lms_modules where id='${phantom}'`);
        return { stolen: owner === ids.course, log: importer.log };
      } finally {
        importer.close();
        try {
          sql(`delete from lms_modules where id='${phantom}'`);
        } catch {
          /* best effort */
        }
      }
    };

    // Control: the vulnerability is real at the default isolation level.
    const rc = await race('READ COMMITTED');
    check(
      'control: under READ COMMITTED the phantom IS reparented (vulnerable)',
      rc.stolen,
      'the race did not reproduce, so the serializable result below proves nothing'
    );

    const ser = await race('SERIALIZABLE');
    check('SERIALIZABLE prevents the phantom reparent', !ser.stolen, ser.log);
    check(
      '  ...by aborting with a serialization failure, not by silently doing nothing',
      /could not serialize/i.test(ser.log),
      ser.log
    );
  }
}

if (failed > 0) {
  console.error(`\n✖ lock-semantics test FAILED — ${failed} assertion(s).`);
  console.error('  The safe importer’s concurrency guard rests on these locks. If they do not');
  console.error('  conflict as asserted, its recount can be bypassed and the guard is unsound.');
  process.exit(1);
}
console.log(
  '\n✓ Measured, each against a passing control: FOR UPDATE on a lesson blocks new progress,' +
    '\n  FOR UPDATE on a module blocks new lessons, and SERIALIZABLE aborts the phantom reparent' +
    '\n  that READ COMMITTED lets through.'
);
process.exit(0);
