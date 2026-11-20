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
      //    nobody consented to losing. Taking this lock first is what makes the read below
      //    complete rather than a snapshot something can still be added to.
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

async function main() {
  const slug = argOf('slug');
  if (!slug) die('no --slug. This importer is slug-scoped by design; there is no --all.');

  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')) as { courses: Course[] };
  const course = catalog.courses.find((c) => c.slug === slug);
  if (!course) die(`slug "${slug}" is not in ${CATALOG}`);

  const apply = has('apply');
  const allowProgressLoss = has('allow-progress-loss');
  const plan = await planImport(course);

  // Decide BEFORE printing. An earlier version printed "applying..." and then refused, which
  // reads as though a write had already begun.
  const blocked = apply && plan.progressAtRisk > 0 && !allowProgressLoss;
  printPlan(plan, plan.foreignIds.length || blocked ? 'blocked' : apply ? 'applying' : 'dry-run');

  // Never consentable: these ids belong to another course, so there is no version of this
  // import that is correct. Refused in dry run too, so the plan is never shown as safe.
  if (plan.foreignIds.length) {
    die(
      `${plan.foreignIds.length} incoming id(s) already belong to a different course:\n` +
        plan.foreignIds.map((id) => `    ${id}`).join('\n') +
        `\n  Importing would move them out of that course. Fix the catalogue ids.`
    );
  }
  if (blocked) {
    die(
      `this import would delete ${plan.progressAtRisk} learner progress row(s).\n` +
        `  Re-run with --allow-progress-loss if that is genuinely intended.`
    );
  }
  if (!apply) return;

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
