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

  return {
    slug: course.slug,
    courseExists: Boolean(existing),
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

async function applyImport(course: Course, plan: ImportPlan) {
  await prisma.$transaction(async (tx) => {
    const courseId = plan.courseExists
      ? ((await tx.lmsCourse.findUnique({ where: { slug: course.slug }, select: { id: true } }))
          ?.id ?? course.id)
      : course.id;

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
    // lesson still sitting here is one the catalogue dropped, and its removal was counted in
    // progressAtRisk and consented to.
    if (plan.moduleRemovals.length) {
      await tx.lmsModule.deleteMany({ where: { id: { in: plan.moduleRemovals } } });
    }
  });
}

async function main() {
  const slug = argOf('slug');
  if (!slug) die('no --slug. This importer is slug-scoped by design; there is no --all.');

  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')) as { courses: Course[] };
  const course = catalog.courses.find((c) => c.slug === slug);
  if (!course) die(`slug "${slug}" is not in ${CATALOG}`);

  const apply = has('apply');
  const plan = await planImport(course);

  // Decide BEFORE printing. An earlier version printed "applying..." and then refused, which
  // reads as though a write had already begun.
  const blocked = apply && plan.progressAtRisk > 0 && !has('allow-progress-loss');
  printPlan(plan, blocked ? 'blocked' : apply ? 'applying' : 'dry-run');

  if (blocked) {
    die(
      `this import would delete ${plan.progressAtRisk} learner progress row(s).\n` +
        `  Re-run with --allow-progress-loss if that is genuinely intended.`
    );
  }
  if (!apply) return;

  await applyImport(course, plan);
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
