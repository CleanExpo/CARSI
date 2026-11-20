#!/usr/bin/env node
/**
 * Safe, versioned, slug-scoped course importer — dry-run first.
 *
 * WHY THIS EXISTS
 *
 * `scripts/seed-courses-catalog.ts` replaces a course's curriculum by deleting it and
 * recreating it: `deleteCourseCurriculum` drops every module for the course, and because
 * `LmsLessonProgress.lesson` is `onDelete: Cascade`, every learner's completion record for
 * that course goes with it. The catalogue carries stable module and lesson IDs, so the
 * recreated rows come back with the SAME ids — but the progress rows are already gone.
 *
 * Measured on a real database, re-seeding a course whose content had not changed at all:
 *
 *     lesson_progress rows   2 -> 0
 *     lesson ids             084df17e,5e61296f,8389f547,87c2f5d5,b464373e (identical)
 *     enrolments             1 -> 1
 *
 * The learner stays enrolled while their completed-lesson history silently resets to zero.
 *
 * WHAT THIS DOES INSTEAD
 *
 * Reconciles rather than replaces. A lesson that still exists in the incoming catalogue is
 * UPDATED IN PLACE, so its row — and therefore every progress record pointing at it —
 * survives. Only modules and lessons genuinely absent from the incoming course are removed,
 * and the progress that would die with them is counted and reported BEFORE anything is
 * written.
 *
 * SAFETY RULES
 *   - Dry run by default. Nothing is written without `--apply`.
 *   - Slug-scoped: exactly one course per run, named explicitly. There is no `--all`.
 *   - Destructive-by-consequence runs fail closed: if the plan would delete learner progress,
 *     `--apply` alone is refused. `--allow-progress-loss` must also be given, so the loss is
 *     always a decision rather than a side effect.
 *   - One transaction: the course either moves to the new revision entirely or not at all.
 *   - Quizzes, practical assessments, enrolments and purchase state hang off the COURSE, not
 *     the curriculum, and are never touched here.
 *
 * Usage:
 *   npx tsx scripts/import-course-safe.ts --slug=<slug>                      # plan only
 *   npx tsx scripts/import-course-safe.ts --slug=<slug> --apply              # apply, if lossless
 *   npx tsx scripts/import-course-safe.ts --slug=<slug> --apply --allow-progress-loss
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';
import { catalogueIdConflicts } from '../src/lib/seed/catalogue-ids';
import { getApprovedCecHours } from '../src/lib/seed/cec-approvals';

const CATALOG = 'data/seed/courses-catalog.json';

type Lesson = {
  id: string;
  title: string;
  contentType: string;
  contentBody?: string | null;
  orderIndex: number;
  isPreview?: boolean;
  resources?: unknown;
  durationMinutes?: number | null;
};
type Module = { id: string; title: string; orderIndex: number; lessons: Lesson[] };
type Course = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  instructorId: string;
  status: string;
  priceAud: number | string;
  isFree: boolean;
  durationHours?: number | null;
  level?: string | null;
  category?: string | null;
  tags?: unknown;
  iicrcDiscipline?: string | null;
  cecHours?: number | null;
  meta?: unknown;
  isPublished?: boolean | null;
  modules: Module[];
};

const argOf = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3).trim() || undefined;
};
const has = (name: string) => process.argv.includes(`--${name}`);

function die(msg: string): never {
  console.error(`refusing: ${msg}`);
  process.exit(1);
}

export type ImportPlan = {
  slug: string;
  courseExists: boolean;
  moduleAdds: string[];
  moduleUpdates: string[];
  moduleRemovals: string[];
  lessonAdds: string[];
  lessonUpdates: string[];
  lessonRemovals: string[];
  /** Progress rows that would be destroyed, because their lesson is being removed. */
  progressAtRisk: number;
  /** Progress rows that survive because their lesson is updated in place. */
  progressPreserved: number;
  /**
   * Incoming module/lesson ids that already belong to a DIFFERENT course. Upserts select by
   * global id and overwrite the parent, so importing course A with one of course B's ids
   * would silently move that row out of B. Never a legitimate import; always refused.
   */
  foreignIds: string[];
  /**
   * True when the incoming course has NO modules at all while the database has some, i.e. this
   * import would leave the course with no curriculum whatsoever.
   *
   * This is not hypothetical. 34 of the 80 entries in data/seed/courses-catalog.json are
   * metadata-only stubs with zero modules, recorded so the CEC approvals registry can reference
   * them by slug; three carry an explicit seedWarning saying a seed of that slug "would replace
   * the course curriculum in the target database with this empty stub". Measured against a real
   * database, importing one of those slugs deleted a module, two lessons and two progress rows
   * and created nothing.
   *
   * The progress guard alone does NOT cover this: with no learner progress attached, the import
   * ran clean and printed "curriculum now matches the catalogue" while destroying the lot.
   */
  emptiesCurriculum: boolean;
};

/**
 * Compare the incoming course against what is in the database. Pure reporting — reads only.
 */
export async function planImport(course: Course): Promise<ImportPlan> {
  const existing = await prisma.lmsCourse.findUnique({
    where: { slug: course.slug },
    select: { id: true, modules: { select: { id: true, lessons: { select: { id: true } } } } },
  });

  const incomingModuleIds = new Set(course.modules.map((m) => m.id));
  const incomingLessonIds = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.id)));

  const existingModuleIds = new Set((existing?.modules ?? []).map((m) => m.id));
  const existingLessonIds = new Set(
    (existing?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id))
  );

  const lessonRemovals = [...existingLessonIds].filter((id) => !incomingLessonIds.has(id));
  const lessonSurvivors = [...existingLessonIds].filter((id) => incomingLessonIds.has(id));

  // The number that matters: progress rows attached to lessons that are about to disappear.
  const progressAtRisk = lessonRemovals.length
    ? await prisma.lmsLessonProgress.count({ where: { lessonId: { in: lessonRemovals } } })
    : 0;
  const progressPreserved = lessonSurvivors.length
    ? await prisma.lmsLessonProgress.count({ where: { lessonId: { in: lessonSurvivors } } })
    : 0;

  // Ownership. An upsert selects by global id, so an incoming id that already belongs to
  // another course would reparent that row into this one — removing curriculum from a course
  // this run never named, and reporting nothing.
  const thisCourseId = existing?.id ?? course.id;
  const foreignModules = await prisma.lmsModule.findMany({
    where: { id: { in: [...incomingModuleIds] }, courseId: { not: thisCourseId } },
    select: { id: true },
  });
  const foreignLessons = await prisma.lmsLesson.findMany({
    where: {
      id: { in: [...incomingLessonIds] },
      module: { courseId: { not: thisCourseId } },
    },
    select: { id: true },
  });

  return {
    slug: course.slug,
    courseExists: Boolean(existing),
    foreignIds: [...foreignModules.map((m) => m.id), ...foreignLessons.map((l) => l.id)],
    emptiesCurriculum: incomingModuleIds.size === 0 && existingModuleIds.size > 0,
    moduleAdds: [...incomingModuleIds].filter((id) => !existingModuleIds.has(id)),
    moduleUpdates: [...incomingModuleIds].filter((id) => existingModuleIds.has(id)),
    moduleRemovals: [...existingModuleIds].filter((id) => !incomingModuleIds.has(id)),
    lessonAdds: [...incomingLessonIds].filter((id) => !existingLessonIds.has(id)),
    lessonUpdates: lessonSurvivors,
    lessonRemovals,
    progressAtRisk,
    progressPreserved,
  };
}

/** Refuse before planning, before instructors, before any write. */
function refuseOnCatalogueConflicts(courses: Course[]) {
  const conflicts = catalogueIdConflicts(courses);
  if (!conflicts.length) return;
  die(
    `${conflicts.length} id conflict(s) inside ${CATALOG} itself:\n` +
      conflicts.map((c) => `    ${c}`).join('\n') +
      `\n  Nothing was read from the database and nothing was written. These are duplicates in\n` +
      `  the catalogue, not a database conflict, so no consent flag applies -- there is no\n` +
      `  correct import of a curriculum id that belongs to two courses. Fix the catalogue ids.`
  );
}

type Instructor = { id: string; email: string; fullName?: string | null };

// Catalogue instructor rows carry a placeholder where a password hash goes, never a usable
// credential: they are authorship records for a course, not accounts anyone signs in with. Same
// constant and same intent as the legacy seeder's.
const SEED_PASSWORD_PLACEHOLDER = 'catalog:seed-from-json';

/**
 * Read-only. Work out which instructor rows this run would have to create, and refuse NOW if a
 * course names one that neither the catalogue nor the database can supply.
 *
 * WHY THIS EXISTS -- measured, not theorised. `lms_courses.instructor_id` is NOT NULL with a
 * foreign key to `lms_users.id`, and no migration creates that row. On a schema-only database
 * with 0 users and 0 courses, the command this importer now backs did this:
 *
 *   npm run db:seed-courses -- --slug=<slug> --apply
 *     Foreign key constraint violated on the constraint: `lms_courses_instructor_id_fkey`
 *     courses after: 0
 *
 * The legacy seeder bootstrapped those rows (`ensureInstructors`) and this importer did not, so
 * making it the default path would have broken every fresh database -- CI's own seed step and any
 * new deployment included. It surfaced only when the new default was run against an untouched
 * database; against an already-seeded one it passes, which is why adopting a path needs a fresh
 * database and not a developer's working one.
 *
 * Refusing here keeps the failure legible and keeps it before the first write, rather than
 * letting a foreign key fire part-way through a transaction.
 */
async function resolveInstructors(
  courses: Course[],
  catalogued: Instructor[]
): Promise<{ needed: string[]; toCreate: Instructor[] }> {
  const needed = [...new Set(courses.map((c) => c.instructorId))];
  const byId = new Map(catalogued.map((i) => [i.id, i]));
  const present = new Set(
    (await prisma.lmsUser.findMany({ where: { id: { in: needed } }, select: { id: true } })).map(
      (u) => u.id
    )
  );

  const unsatisfiable = needed.filter((id) => !byId.has(id) && !present.has(id));
  if (unsatisfiable.length) {
    die(
      `${unsatisfiable.length} instructor id(s) named by these courses do not exist and cannot\n` +
        `  be created, because ${CATALOG} does not list them under "instructors" either:\n` +
        unsatisfiable.map((id) => `    ${id}`).join('\n') +
        `\n  lms_courses.instructor_id is NOT NULL with a foreign key to lms_users.id, so the\n` +
        `  import would die on that constraint part-way through. Nothing was written. Add the\n` +
        `  instructor to the catalogue, or create the user row first.`
    );
  }

  // Only the rows the catalogue has to supply. An instructor already in the database is left
  // exactly as it is: importing a course does not rewrite a live user row as a side effect.
  return { needed, toCreate: needed.filter((id) => !present.has(id)).map((id) => byId.get(id)!) };
}

/** Writes. Called only under --apply, and only after every blocker has passed. */
async function ensureInstructors(needed: string[], toCreate: Instructor[]) {
  if (toCreate.length) {
    console.log(`  creating ${toCreate.length} catalogue instructor row(s) (none existed)`);
    // ON CONFLICT DO NOTHING on the id, so two importers racing on a fresh database do not make
    // each other fail, and a re-run is a no-op.
    await prisma.lmsUser.createMany({
      data: toCreate.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName ?? null,
        hashedPassword: SEED_PASSWORD_PLACEHOLDER,
        isActive: true,
        isVerified: true,
      })),
      skipDuplicates: true,
    });
  }

  // A positive check, not an assumption. skipDuplicates also swallows a conflict on the UNIQUE
  // email, which would leave the id still absent and every course insert still doomed -- and the
  // operator would get a foreign-key error instead of an explanation. Prove the ids are there.
  const have = new Set(
    (await prisma.lmsUser.findMany({ where: { id: { in: needed } }, select: { id: true } })).map(
      (u) => u.id
    )
  );
  const missing = needed.filter((id) => !have.has(id));
  if (missing.length) {
    die(
      `${missing.length} instructor row(s) are still absent after the bootstrap:\n` +
        missing.map((id) => `    ${id}`).join('\n') +
        `\n  The most likely cause is another lms_users row already holding the catalogue\n` +
        `  instructor's email address under a different id, so the insert was skipped. No course\n` +
        `  was written. Reconcile the user row by hand.`
    );
  }
}

function printPlan(plan: ImportPlan, outcome: 'dry-run' | 'applying' | 'blocked') {
  console.log(`\ncourse "${plan.slug}" — ${plan.courseExists ? 'update' : 'create'}`);
  console.log(
    `  modules   +${plan.moduleAdds.length}  ~${plan.moduleUpdates.length}  -${plan.moduleRemovals.length}`
  );
  console.log(
    `  lessons   +${plan.lessonAdds.length}  ~${plan.lessonUpdates.length}  -${plan.lessonRemovals.length}`
  );
  console.log(`  learner progress preserved: ${plan.progressPreserved}`);
  console.log(
    `  learner progress AT RISK:   ${plan.progressAtRisk}` +
      (plan.progressAtRisk ? '   <-- these rows die with their removed lessons' : '')
  );
  if (outcome === 'applying') console.log('\napplying (one transaction)...');
  else if (outcome === 'blocked') console.log('\nREFUSED — nothing written. See below.');
  else console.log('\nDRY RUN — nothing written. Add --apply.');
}

const asJson = (v: unknown) =>
  v === undefined || v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue);

async function applyImport(course: Course, plan: ImportPlan, allowProgressLoss: boolean) {
  const incomingModuleIds = course.modules.map((m) => m.id);
  const incomingLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));

  await prisma.$transaction(
    async (tx) => {
      const courseId = plan.courseExists
        ? ((await tx.lmsCourse.findUnique({ where: { slug: course.slug }, select: { id: true } }))
            ?.id ?? course.id)
        : course.id;

      // ---- Re-decide, under locks, everything planImport decided without them. ----
      //
      // planImport reads outside any transaction, so each of its conclusions can be stale by
      // the time we arrive here. Two of them destroy data when wrong, so both are taken again
      // under locks that block the very writes that would invalidate them.
      //
      // The conflict those locks rely on is MEASURED, not assumed. On Postgres 16.15 inserting
      // a child row runs
      //     SELECT 1 FROM ONLY <parent> x WHERE id = $1 FOR KEY SHARE OF x
      // as its foreign-key check, and that statement blocks against FOR UPDATE on the parent.
      // Verified both ways in scripts/import-course-safe.locks.test.mjs: FOR UPDATE on a lesson
      // blocks new progress for it, and FOR UPDATE on a module blocks new lessons under it,
      // until this transaction ends.

      // 1. Lock the doomed modules BEFORE reading what is inside them. Deleting a module
      //    cascades module -> lesson -> progress, so a lesson inserted into a doomed module
      //    after planning dies with it, taking progress that plan.progressAtRisk never saw and
      //    nobody consented to losing.
      //
      //    This lock does NOT make the read below complete, and an earlier version of this
      //    comment wrongly said it did. Under SERIALIZABLE the snapshot is fixed by this
      //    transaction's first statement, so what the read can see was already decided before
      //    the lock was taken. Two different windows, two different guards:
      //      - a lesson committed AFTER this lock cannot be inserted at all, because its
      //        foreign-key check needs FOR KEY SHARE on a module we hold FOR UPDATE;
      //      - a lesson committed between the snapshot and this lock is invisible to the read,
      //        and no row lock can reach it. Postgres covers that one itself: its cascade
      //        refuses to delete rows not visible to a serializable snapshot, aborting with
      //        "could not serialize access due to concurrent update" from inside
      //        DELETE FROM ONLY lms_lessons.
      //    Both are measured in scripts/import-course-safe.locks.test.mjs (blocks B and D),
      //    each against a READ COMMITTED control that loses the row.
      //
      //    SO BE CLEAR ABOUT WHICH ONE IS THE GUARANTEE: it is the ABORT, not this lock. The
      //    lock narrows the window; it cannot close it, because it is always taken after the
      //    snapshot is already fixed. Only the serializable abort covers every case. Anyone
      //    tempted to drop the isolation level back to READ COMMITTED because "we take the
      //    locks anyway" would be removing the actual protection and keeping the decoration:
      //    block D fails immediately under READ COMMITTED, with both rows silently deleted.
      //    (Review initially advised the lock-first ordering as sufficient and then withdrew
      //    that advice on reading the Postgres source. Keeping the correction here, in the
      //    code, rather than only in the pull request.)
      if (plan.moduleRemovals.length) {
        await tx.$queryRaw`SELECT id FROM lms_modules WHERE id = ANY(${plan.moduleRemovals}::uuid[]) FOR UPDATE`;
      }

      // 2. Everything this transaction will actually destroy: lessons the catalogue dropped,
      //    plus whatever is still sitting in a doomed module that the catalogue does not claim.
      //    That second set is precisely what the plan's count cannot include.
      const doomed = await tx.lmsLesson.findMany({
        where: {
          OR: [
            { id: { in: plan.lessonRemovals } },
            ...(plan.moduleRemovals.length
              ? [{ moduleId: { in: plan.moduleRemovals }, id: { notIn: incomingLessonIds } }]
              : []),
          ],
        },
        select: { id: true },
      });
      const doomedIds = doomed.map((l) => l.id);

      if (doomedIds.length) {
        await tx.$queryRaw`SELECT id FROM lms_lessons WHERE id = ANY(${doomedIds}::uuid[]) FOR UPDATE`;
        const atRiskNow = await tx.lmsLessonProgress.count({
          where: { lessonId: { in: doomedIds } },
        });
        if (atRiskNow > 0 && !allowProgressLoss) {
          throw new Error(
            `aborted: this import would destroy ${atRiskNow} learner progress row(s), which the ` +
              `plan did not show. Nothing was written. Re-run to see the current plan, and pass ` +
              `--allow-progress-loss only if losing them is genuinely intended.`
          );
        }
      }

      // 3. Ownership again, and under lock. The upserts below select by GLOBAL id and overwrite
      //    the parent, so an incoming id owned by another course would be reparented into this
      //    one, stripping curriculum from a course this run never named. planImport checked it,
      //    but another writer could have moved an id into another course since. No consent flag
      //    exists for this: there is no version of it that is correct.
      await tx.$queryRaw`SELECT id FROM lms_modules WHERE id = ANY(${incomingModuleIds}::uuid[]) FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM lms_lessons WHERE id = ANY(${incomingLessonIds}::uuid[]) FOR UPDATE`;
      const foreignModules = await tx.lmsModule.findMany({
        where: { id: { in: incomingModuleIds }, courseId: { not: courseId } },
        select: { id: true },
      });
      const foreignLessons = await tx.lmsLesson.findMany({
        where: { id: { in: incomingLessonIds }, module: { courseId: { not: courseId } } },
        select: { id: true },
      });
      const foreignNow = [...foreignModules.map((m) => m.id), ...foreignLessons.map((l) => l.id)];
      if (foreignNow.length) {
        throw new Error(
          `aborted: ${foreignNow.length} incoming id(s) belong to a different course:\n` +
            foreignNow.map((id) => `    ${id}`).join('\n') +
            `\n  Nothing was written. Fix the catalogue ids.`
        );
      }

      const scalars = {
        title: course.title,
        description: course.description ?? null,
        shortDescription: course.shortDescription ?? null,
        thumbnailUrl: course.thumbnailUrl ?? null,
        instructorId: course.instructorId,
        status: course.status,
        priceAud: new Prisma.Decimal(course.priceAud),
        isFree: course.isFree,
        durationHours: course.durationHours ?? null,
        level: course.level ?? null,
        category: course.category ?? null,
        tags: asJson(course.tags),
        iicrcDiscipline: course.iicrcDiscipline ?? null,
        // Licence-critical, and reused rather than reimplemented: CEC hours come ONLY from the
        // approvals registry (the SSOT) or the catalogue's explicit founder-set value. Nothing
        // is derived here. Same call the existing seeder makes.
        cecHours: getApprovedCecHours(course.slug) ?? course.cecHours ?? null,
        meta: asJson(course.meta),
        isPublished: course.isPublished ?? null,
      };

      await tx.lmsCourse.upsert({
        where: { slug: course.slug },
        create: { id: courseId, slug: course.slug, ...scalars },
        update: scalars,
      });

      // Lessons genuinely absent from the catalogue go now. Their progress dies with them, and
      // that count was reported and consented to before we got here.
      if (plan.lessonRemovals.length) {
        await tx.lmsLesson.deleteMany({ where: { id: { in: plan.lessonRemovals } } });
      }

      // ORDER IS LOAD-BEARING. Obsolete modules are deleted AFTER the lesson upserts below, not
      // here. A lesson that MOVES from a removed module to a surviving one is still "preserved"
      // as far as the plan is concerned — its id is in both sets — but deleting its old module
      // first would cascade through the lesson to its progress, and the upsert would then
      // recreate the lesson with no history. The plan would have promised 0 rows at risk while
      // silently destroying them: the exact defect this importer exists to prevent. Reparent
      // first, delete the emptied modules last.

      // Upsert in place — this is the whole point. A surviving lesson keeps its row, so every
      // lms_lesson_progress row pointing at it keeps its foreign key and its history.
      for (const m of course.modules) {
        await tx.lmsModule.upsert({
          where: { id: m.id },
          create: { id: m.id, courseId, title: m.title, orderIndex: m.orderIndex },
          update: { courseId, title: m.title, orderIndex: m.orderIndex },
        });
        for (const l of m.lessons) {
          const lesson = {
            moduleId: m.id,
            title: l.title,
            contentType: l.contentType,
            contentBody: l.contentBody ?? null,
            orderIndex: l.orderIndex,
            isPreview: l.isPreview ?? false,
            resources: asJson(l.resources),
            durationMinutes: l.durationMinutes ?? null,
          };
          await tx.lmsLesson.upsert({
            where: { id: l.id },
            create: { id: l.id, ...lesson },
            update: lesson,
          });
        }
      }

      // Now, and only now. Every retained lesson has been reparented to its destination module
      // above, so these modules hold nothing we meant to keep and the cascade is harmless. A
      // lesson still sitting here is one the catalogue dropped, and its progress was counted by
      // the locked recount in step 2 and consented to — including any that arrived after the
      // plan was printed, which is the whole reason that recount exists.
      if (plan.moduleRemovals.length) {
        await tx.lmsModule.deleteMany({ where: { id: { in: plan.moduleRemovals } } });
      }
    },
    {
      // FOR UPDATE cannot lock a row that does not exist yet, so an id CREATED under another
      // course between the ownership check above and the upserts below sits outside every lock
      // taken there. Serializable is what closes that last gap.
      //
      // Be precise about WHY, because the first version of this comment got it wrong and the
      // measured error says so. It is not SSI predicate locks over the ownership reads: that
      // failure reads "could not serialize access due to read/write dependencies among
      // transactions". What is actually measured here is
      //     ERROR: could not serialize access due to concurrent update
      // which is Postgres checking, in ExecCheckTupleVisible, whether the row an upsert
      // conflicted with is visible to this transaction's snapshot -- and refusing when it is
      // not, because the snapshot predates the rival's commit. Either way the row is not
      // reparented; but the guarantee rests on the upsert's conflict path under a serializable
      // snapshot, not on the reads above, so do not assume removing those reads is free.
      //
      // The cost is that a genuinely concurrent write can abort this import; main() reports it
      // as "nothing was written, re-run", which is the right failure for a tool whose entire
      // purpose is to not lose data.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      // Prisma's interactive-transaction default is 5000 ms, and this transaction does one
      // sequential write per module and per lesson: the largest catalogue course
      // (floor-care-onboarding, 12 modules / 38 lessons) is ~51 round-trips plus the locks and
      // reads. Measured end-to-end at ~850 ms against a local unix-socket Postgres, so ~5 ms a
      // round-trip; against a networked database at 60 ms that is ~3 s and the default becomes a
      // coin toss. It was: the first end-to-end race test of this importer died on P2028, not on
      // anything to do with the race.
      //
      // 30 s is deliberate on both sides. It is ~6x the worst networked estimate, and it BOUNDS
      // the window in which this transaction's FOR UPDATE locks keep learners from saving
      // progress on the affected lessons. A minutes-long ceiling would trade one data-integrity
      // problem for an availability one.
      timeout: 30_000,
      maxWait: 10_000,
    }
  );
}

/** Why a course cannot be imported with the flags given. Empty means it is clear to apply. */
function blockers(
  plan: ImportPlan,
  allowProgressLoss: boolean,
  allowEmptyCurriculum: boolean
): string[] {
  const out: string[] = [];
  // Never consentable: these ids belong to another course, so no version of this import is right.
  if (plan.foreignIds.length) {
    out.push(`${plan.foreignIds.length} incoming id(s) belong to a different course`);
  }
  if (plan.emptiesCurriculum && !allowEmptyCurriculum) {
    out.push(
      `would delete the ENTIRE curriculum (${plan.moduleRemovals.length} module(s), ` +
        `${plan.lessonRemovals.length} lesson(s)) and create nothing`
    );
  }
  if (plan.progressAtRisk > 0 && !allowProgressLoss) {
    out.push(`would delete ${plan.progressAtRisk} learner progress row(s)`);
  }
  return out;
}

/**
 * Whole-catalogue import.
 *
 * This exists so the safe importer can replace the legacy seeder as the DEFAULT path. Without it
 * `db:seed-courses -- --all` had nowhere to go but the delete-and-recreate seeder, which is the
 * thing being retired.
 *
 * It is NOT a loop over the single-slug path. Two differences matter:
 *
 *   - EVERY course is planned, read-only, BEFORE anything is written. One blocked course refuses
 *     the whole run. A half-applied catalogue is worse than an unapplied one, and an operator
 *     who is told "course 34 of 80 would destroy progress" after 33 courses have been committed
 *     has no clean state to return to.
 *   - Each course is then applied in its OWN transaction, as the legacy seeder did. One
 *     serialization failure must not discard 79 good imports.
 */
async function importAll(
  courses: Course[],
  instructors: Instructor[],
  apply: boolean,
  allowProgressLoss: boolean,
  allowEmptyCurriculum: boolean
) {
  console.log(`\nplanning ${courses.length} course(s) from ${CATALOG} \u2014 nothing written yet`);

  // Before everything else, and needing no database: a duplicate id inside the catalogue would
  // otherwise pass every plan and then abort part-way through the apply loop.
  refuseOnCatalogueConflicts(courses);

  // Read-only, and before the planning loop: a catalogue that names an instructor nobody can
  // supply is refused with an explanation rather than a foreign-key error on course 1 of 80.
  const { needed, toCreate } = await resolveInstructors(courses, instructors);

  const evaluated: Array<{ course: Course; plan: ImportPlan; why: string[] }> = [];
  for (const course of courses) {
    const plan = await planImport(course);
    evaluated.push({ course, plan, why: blockers(plan, allowProgressLoss, allowEmptyCurriculum) });
  }

  const changing = evaluated.filter(
    (e) =>
      e.plan.moduleAdds.length ||
      e.plan.moduleRemovals.length ||
      e.plan.lessonAdds.length ||
      e.plan.lessonRemovals.length ||
      !e.plan.courseExists
  );
  const blocked = evaluated.filter((e) => e.why.length);
  const progressPreserved = evaluated.reduce((n, e) => n + e.plan.progressPreserved, 0);
  const progressAtRisk = evaluated.reduce((n, e) => n + e.plan.progressAtRisk, 0);

  // EVERY evaluated course is written, not just the structurally changed ones: applyImport
  // upserts the course scalars (title, pricing, CEC hours, meta) and every lesson's content
  // whether or not the curriculum structure moved. The old wording here said
  // "N course(s) with curriculum changes, M unchanged", which was false. Measured on an
  // already-seeded database, a second --all --apply printed "0 course(s) with curriculum
  // changes, 80 unchanged" and "applying 0 course(s)", then moved updated_at on all 80.
  // Understating what a seeder wrote is the exact failure this importer exists to stop; its own
  // output does not get to commit it.
  console.log(
    `  ${evaluated.length} course(s) will be WRITTEN \u2014 course metadata and lesson content are` +
      `\n  rewritten for every one, whether or not the curriculum structure moved`
  );
  console.log(
    `  of those, ${changing.length} have curriculum STRUCTURE changes` +
      ` (modules or lessons added/removed)${changing.length ? ':' : ''}`
  );
  for (const e of changing.slice(0, 20)) {
    console.log(
      `    ${e.course.slug}` +
        `  modules +${e.plan.moduleAdds.length}/-${e.plan.moduleRemovals.length}` +
        `  lessons +${e.plan.lessonAdds.length}/-${e.plan.lessonRemovals.length}`
    );
  }
  if (changing.length > 20) console.log(`    ... and ${changing.length - 20} more`);
  console.log(`  learner progress preserved: ${progressPreserved}`);
  console.log(
    `  learner progress AT RISK:   ${progressAtRisk}` +
      (progressAtRisk ? '   <-- these rows die with their removed lessons' : '')
  );

  if (blocked.length) {
    console.error(
      `\nREFUSED \u2014 nothing written. ${blocked.length} course(s) cannot be imported:\n`
    );
    for (const e of blocked) {
      console.error(`    ${e.course.slug}`);
      for (const w of e.why) console.error(`      ${w}`);
    }
    die(
      `the whole run is refused, deliberately: a half-applied catalogue is worse than an\n` +
        `  unapplied one. Fix the catalogue, import the courses you mean with --slug=<slug>, or\n` +
        `  pass the consent flag the message above names.`
    );
  }

  if (!apply) {
    console.log('\nDRY RUN \u2014 nothing written. Add --apply.');
    return;
  }

  // evaluated, not changing: the loop below writes every course. Saying "applying 0" and then
  // writing 80 is the contradiction this replaces.
  console.log(`\napplying ${evaluated.length} course(s), one transaction each...`);
  // After every blocker, so a refused run still writes nothing -- the ordering mistake this
  // repo already made once in the legacy seeder, where the instructor upsert committed before
  // the preflight and "NOTHING has been written" was false.
  await ensureInstructors(needed, toCreate);
  let done = 0;
  for (const e of evaluated) {
    await applyImport(e.course, e.plan, allowProgressLoss);
    done += 1;
  }
  console.log(`done. ${done} course(s) imported; ${progressPreserved} progress row(s) preserved.`);
}

async function main() {
  const slug = argOf('slug');
  const all = has('all');
  // Same contract as the legacy seeder it replaces: exactly one of --slug or --all. npm drops a
  // bare --slug=x that is not after --, so a slugless run is an easy mistake to make.
  if (slug && all) die('--slug and --all together. Pick one.');
  if (!slug && !all) {
    die(
      'no --slug and no --all. Import one course with -- --slug=<slug>, or the whole\n' +
        '  catalogue with -- --all. Both are dry runs until you add --apply.'
    );
  }

  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')) as {
    courses: Course[];
    instructors?: Instructor[];
  };
  const instructors = catalog.instructors ?? [];

  const apply = has('apply');
  const allowProgressLoss = has('allow-progress-loss');
  const allowEmptyCurriculum = has('allow-empty-curriculum');

  if (all) {
    await importAll(catalog.courses, instructors, apply, allowProgressLoss, allowEmptyCurriculum);
    return;
  }

  const course = catalog.courses.find((c) => c.slug === slug);
  if (!course) die(`slug "${slug}" is not in ${CATALOG}`);
  // One course cannot collide with another incoming course, but it can list the same module or
  // lesson id twice, in which case the second upsert silently wins.
  refuseOnCatalogueConflicts([course]);
  const plan = await planImport(course);

  // An import that would leave the course with NO curriculum is refused. The progress guard does
  // not cover it: measured against a real database, a stub import with no learner progress
  // attached ran clean and printed "curriculum now matches the catalogue" while deleting a module
  // and two lessons. 34 of 80 catalogue entries are metadata-only stubs, so this is the ordinary
  // case, not the exotic one.
  //
  // Unlike a foreign id, emptying a course is conceivably deliberate one day, so there is a flag
  // rather than a flat refusal -- but it is not --allow-progress-loss. Losing progress and
  // deleting an entire curriculum are different decisions and must be consented to separately.
  const emptyBlocked = apply && plan.emptiesCurriculum && !allowEmptyCurriculum;
  const blocked = apply && plan.progressAtRisk > 0 && !allowProgressLoss;
  printPlan(
    plan,
    plan.foreignIds.length || blocked || emptyBlocked ? 'blocked' : apply ? 'applying' : 'dry-run'
  );

  // Say it in the dry run too, so the plan is never read as safe by someone who only looks at
  // the counts. The run is not refused here -- a preview that refuses to preview is useless --
  // but it cannot be quiet about it either.
  if (plan.emptiesCurriculum && !apply) {
    console.log(
      `\n  WARNING: the catalogue has NO modules for "${plan.slug}", so applying this would\n` +
        `  delete its entire curriculum (${plan.moduleRemovals.length} module(s), ` +
        `${plan.lessonRemovals.length} lesson(s)) and create nothing.\n` +
        `  34 of the catalogue's entries are metadata-only stubs. If this is one of them, this\n` +
        `  is a catalogue defect, not an import. --apply will refuse.`
    );
  }

  // Never consentable: these ids belong to another course, so there is no version of this
  // import that is correct. Refused in dry run too, so the plan is never shown as safe.
  if (plan.foreignIds.length) {
    die(
      `${plan.foreignIds.length} incoming id(s) already belong to a different course:\n` +
        plan.foreignIds.map((id) => `    ${id}`).join('\n') +
        `\n  Importing would move them out of that course. Fix the catalogue ids.`
    );
  }
  if (emptyBlocked) {
    die(
      `the catalogue has NO modules for "${plan.slug}", so this import would delete the\n` +
        `  course's ENTIRE curriculum (${plan.moduleRemovals.length} module(s), ` +
        `${plan.lessonRemovals.length} lesson(s)) and create nothing.\n` +
        `  This is what a metadata-only catalogue stub does to a populated database, and 34 of\n` +
        `  the catalogue's 80 entries are such stubs. Fix the catalogue entry, or pass\n` +
        `  --allow-empty-curriculum if emptying this course really is the intention.`
    );
  }
  if (blocked) {
    die(
      `this import would delete ${plan.progressAtRisk} learner progress row(s).\n` +
        `  Re-run with --allow-progress-loss if that is genuinely intended.`
    );
  }
  // Read-only, and reported in the dry run too, so a missing instructor is not a surprise that
  // waits for --apply.
  const { needed, toCreate } = await resolveInstructors([course], instructors);

  if (!apply) return;

  await ensureInstructors(needed, toCreate);

  try {
    await applyImport(course, plan, allowProgressLoss);
  } catch (e) {
    // Serializable makes a concurrent write to this course abort the import rather than let it
    // reparent or destroy a row the plan never mentioned. Report that as the recoverable thing
    // it is: nothing was written, so re-running is always safe.
    const code = (e as { code?: string }).code;
    if (code === 'P2034' || /40001|could not serialize/i.test(String(e))) {
      die(
        'aborted: another write to this course landed while the import was running, so the\n' +
          '  transaction could not be serialized. NOTHING was written \u2014 re-run it.'
      );
    }
    if (code === 'P2028' || /expired transaction/i.test(String(e))) {
      die(
        'aborted: the transaction ran out of time before it finished. NOTHING was written \u2014\n' +
          '  the whole point of the single transaction is that a partial curriculum is never\n' +
          '  committed. Re-run it; if it keeps timing out the database is too slow or too\n' +
          '  contended for this course size, and the timeout above needs raising deliberately.'
      );
    }
    throw e;
  }
  const after = await planImport(course);
  console.log(
    `done. ${after.lessonAdds.length + after.lessonRemovals.length === 0 ? 'curriculum now matches the catalogue' : 'WARNING: drift remains'}; ` +
      `${after.progressPreserved} progress row(s) present.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
