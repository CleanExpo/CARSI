/**
 * Upsert LMS courses from `data/seed/courses-catalog.json` into Postgres (e.g. remote server).
 * Idempotent per course slug: replaces modules/lessons to match the JSON snapshot.
 *
 * Usage (target DB), one of these is required (a run with neither is refused):
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses -- --slug=<slug>   (one course)
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses -- --all           (whole catalogue)
 * SEED_COURSE_SLUG=<slug> works in place of --slug. Without `--`, npm keeps the flag itself.
 *
 * Optional:
 *   SEED_INSTRUCTOR_ID=<uuid> — force every course to use this instructor (must exist or be listed in JSON).
 *
 * Loads `.env` when present via dotenv/config.
 *
 * MANUAL ONLY — do NOT wire this into the deploy/boot path. Production boot (`start:production`)
 * applies migrations and starts the server without seeding; the live DB is the source of truth
 * for course content, so seeding at deploy would overwrite manually-curated prod rows (GP-503).
 * Run only for a deliberate, reviewed re-seed (docs/runbooks/course-go-live.md):
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses -- --slug=<slug>
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
import type { CatalogCourse, CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import {
  COURSES_CATALOG_VERSION,
  isCoursesCatalogFile,
} from '../src/lib/seed/courses-catalog-types';
import { getApprovedCecHours } from '../src/lib/seed/cec-approvals';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

const SEED_PASSWORD_PLACEHOLDER = 'catalog:seed-from-json';

function jsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

async function ensureInstructors(data: CoursesCatalogFile) {
  for (const u of data.instructors) {
    await prisma.lmsUser.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        hashedPassword: SEED_PASSWORD_PLACEHOLDER,
        isActive: true,
        isVerified: true,
      },
      update: {
        email: u.email,
        fullName: u.fullName,
      },
    });
  }
}

async function deleteCourseCurriculum(tx: PrismaTx, courseId: string) {
  const modules = await tx.lmsModule.findMany({
    where: { courseId },
    select: { id: true },
  });
  const moduleIds = modules.map((m) => m.id);
  if (moduleIds.length === 0) return;

  const lessons = await tx.lmsLesson.findMany({
    where: { moduleId: { in: moduleIds } },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    await tx.lmsLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
  }

  await tx.lmsModule.deleteMany({ where: { courseId } });
}

async function seedCourse(c: CatalogCourse, instructorOverride: string | undefined) {
  const instructorId = instructorOverride?.trim() || c.instructorId;
  // CEC hours come ONLY from the approvals registry (data/seed/cec-approvals.json, the SSOT)
  // or the catalog's explicit founder-set value, stored verbatim (0 = the not-CEC-approved
  // opt-out, which the read-time resolvers honour). Nothing is derived (licence-critical).
  const cecHours = getApprovedCecHours(c.slug) ?? c.cecHours ?? null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.lmsCourse.findUnique({
      where: { slug: c.slug },
      select: { id: true },
    });
    const courseId = existing?.id ?? c.id;

    // A zero-module catalogue entry has nothing to put back, so there is nothing to make room
    // for: DON'T DELETE AT ALL. The delete exists only to clear the way for the incoming
    // curriculum, and an empty incoming curriculum needs no clearing.
    //
    // This replaces a count-then-check guard, which could not have worked. At READ COMMITTED a
    // writer can commit a module after the count returns zero and before deleteCourseCurriculum
    // reads the module list, and the helper would then delete it with no replacement. Guarding
    // the call could only ever narrow that window; not making the call closes it by
    // construction, for every isolation level, with no lock and no recount.
    //
    // The count below is for the LOG LINE only. A stale count misreports a number in a message;
    // it cannot lose data, because nothing here deletes anything.
    if (c.modules.length === 0) {
      const populated = await tx.lmsModule.count({ where: { courseId } });
      if (populated > 0) {
        console.warn(
          `  note: "${c.slug}" has no modules in the catalogue, so its ${populated} existing` +
            ` module(s) were left untouched. Metadata only — curriculum was NOT replaced.`
        );
      }
    } else {
      await deleteCourseCurriculum(tx, courseId);
    }

    const priceAud = new Prisma.Decimal(c.priceAud);

    await tx.lmsCourse.upsert({
      where: { slug: c.slug },
      create: {
        id: courseId,
        slug: c.slug,
        title: c.title,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        instructorId,
        status: c.status,
        priceAud,
        isFree: c.isFree,
        durationHours: c.durationHours,
        level: c.level,
        category: c.category,
        tags: jsonInput(c.tags),
        iicrcDiscipline: c.iicrcDiscipline,
        cecHours,
        meta: jsonInput(c.meta),
        isPublished: c.isPublished,
        modules: {
          create: c.modules.map((m) => ({
            id: m.id,
            title: m.title,
            orderIndex: m.orderIndex,
            lessons: {
              create: m.lessons.map((l) => ({
                id: l.id,
                title: l.title,
                contentType: l.contentType,
                contentBody: l.contentBody,
                orderIndex: l.orderIndex,
                isPreview: l.isPreview,
                resources: jsonInput(l.resources),
              })),
            },
          })),
        },
      },
      update: {
        title: c.title,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnailUrl: c.thumbnailUrl,
        instructorId,
        status: c.status,
        priceAud,
        isFree: c.isFree,
        durationHours: c.durationHours,
        level: c.level,
        category: c.category,
        tags: jsonInput(c.tags),
        iicrcDiscipline: c.iicrcDiscipline,
        cecHours,
        meta: jsonInput(c.meta),
        isPublished: c.isPublished,
      },
    });

    if (existing) {
      for (const m of c.modules) {
        await tx.lmsModule.create({
          data: {
            id: m.id,
            courseId,
            title: m.title,
            orderIndex: m.orderIndex,
            lessons: {
              create: m.lessons.map((l) => ({
                id: l.id,
                title: l.title,
                contentType: l.contentType,
                contentBody: l.contentBody,
                orderIndex: l.orderIndex,
                isPreview: l.isPreview,
                resources: jsonInput(l.resources),
              })),
            },
          },
        });
      }
    }
  });
}

/**
 * Which courses to seed. A whole-catalogue seed deletes learner lesson progress for every
 * course (deleteCourseCurriculum), so it must be asked for explicitly with `--all`. A missing
 * or blank slug is refused: npm drops `--slug=x` unless it follows `--`, which would otherwise
 * turn a one-course seed into a whole-catalogue one. Runs before any database access.
 */
function seedScope(): { slug: string } | { all: true } {
  const all = process.argv.includes('--all');
  const envRaw = process.env.SEED_COURSE_SLUG;
  const flag = process.argv.find((a) => a.startsWith('--slug='));
  const refuse = (why: string): never => {
    console.error(
      `refusing: ${why}. Seed one course with -- --slug=<slug>, or the whole catalogue with -- --all.`
    );
    process.exit(1);
  };
  if (envRaw !== undefined && !envRaw.trim()) refuse('blank SEED_COURSE_SLUG');
  if (flag !== undefined && !flag.slice('--slug='.length).trim()) refuse('blank --slug');
  const slug = (envRaw?.trim() || flag?.slice('--slug='.length).trim() || '').toLowerCase();
  if (all && slug) refuse('--all and a slug together');
  if (all) return { all: true };
  if (!slug) refuse('no --slug and no --all');
  return { slug };
}

async function main() {
  const scope = seedScope();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  // THIS SCRIPT IS NO LONGER THE DEFAULT IMPORT PATH.
  //
  // scripts/import-course-safe.ts is, and `db:seed-courses` now points at it. What remains here
  // is a restricted migration path, kept because delete-and-recreate is occasionally the thing
  // you actually want (a corrupted curriculum, a course being rebuilt from scratch) and because
  // deleting the script would strand the documentation that still names it.
  //
  // It is restricted rather than deleted, and the restriction is an explicit flag rather than a
  // rename, because the directive this came from is specific: prove the old destructive
  // behaviour cannot be triggered ACCIDENTALLY. A rename would not do that -- someone following
  // a stale runbook would simply type the new name. Nobody types this flag by accident.
  //
  // What this script still does that the importer does not: it REPLACES a course's curriculum,
  // deleting every module and lesson and -- deliberately, not merely by cascade -- every
  // lms_lesson_progress row attached to them. The importer reconciles instead, so a lesson that
  // still exists in the catalogue keeps its row and its learner progress.
  if (!process.argv.includes('--legacy-destructive-replace')) {
    console.error(
      `\nrefusing: this is the LEGACY destructive seeder. It is no longer the default path.\n\n` +
        `  It deletes every module and lesson for the course(s) it touches, and every learner\n` +
        `  progress row attached to them, then recreates the curriculum from the catalogue.\n` +
        `  A lesson whose content did not change still loses its learners' completion history.\n\n` +
        `  Use the safe importer instead. It reconciles rather than replaces, so progress on a\n` +
        `  retained lesson survives, and it is a dry run until you ask for a write:\n\n` +
        `      npm run db:seed-courses -- --slug=<slug>            # preview one course\n` +
        `      npm run db:seed-courses -- --slug=<slug> --apply    # write it\n` +
        `      npm run db:seed-courses -- --all --apply            # whole catalogue\n\n` +
        `  If replacing the curriculum really is what you want -- a rebuild, a corrupted\n` +
        `  course -- say so explicitly and this script will run:\n\n` +
        `      npm run db:seed-courses-legacy -- --slug=<slug> --legacy-destructive-replace\n\n` +
        `  NOTHING has been written.\n`
    );
    process.exit(1);
  }

  const raw = readFileSync(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!isCoursesCatalogFile(data)) {
    console.error(
      `Invalid catalog: expected version ${COURSES_CATALOG_VERSION} with instructors[] and courses[].`
    );
    process.exit(1);
  }

  const onlySlug = 'slug' in scope ? scope.slug : undefined;
  const courses = onlySlug
    ? data.courses.filter((c) => c.slug.trim().toLowerCase() === onlySlug)
    : data.courses;

  if (courses.length === 0) {
    if (onlySlug) {
      console.error(`No course with slug "${onlySlug}" in ${CATALOG_PATH}.`);
      process.exit(1);
    }
    console.log(
      'No courses in catalog; nothing to seed. Run db:export-courses locally and commit JSON.'
    );
    return;
  }

  const override = process.env.SEED_INSTRUCTOR_ID?.trim();

  // PREFLIGHT: refuse a run in which a zero-module catalogue entry meets a populated course.
  //
  // READ THE REASON CAREFULLY, because it is no longer the obvious one. seedCourse now SKIPS the
  // curriculum delete entirely for a zero-module entry, so such a seed is no longer destructive.
  // What it is instead is a SILENT NO-OP: the course record updates, the existing curriculum is
  // left exactly as it was, and the run prints "Seeded course: <slug>" over content it never
  // touched. An operator who seeds a course and is told it succeeded will reasonably believe the
  // database now matches the catalogue. For these 34 entries it does not and cannot.
  //
  // So this refuses in order to surface a CATALOGUE DEFECT, not to prevent a deletion.
  //
  // 34 of the 80 entries in this catalogue are metadata-only stubs with zero modules, recorded
  // so the CEC approvals registry can reference them by slug; three carry an explicit
  // seedWarning that seeding the slug "would replace the course curriculum in the target
  // database with this empty stub".
  //
  // HISTORY, not current behaviour -- measured against a real database before any of this
  // existed, and the reason the guards were written: seeding one stub slug deleted
  // 1 module, 2 lessons and 2 learner progress rows, created nothing, and printed
  // "Seeded course: <slug>" followed by "Done." A success message over total destruction.
  // `--all` walks every entry, so it would do that to all 34 at once.
  //
  // The check is deliberately scoped to courses that HAVE curriculum right now. On a fresh or
  // CI database a stub course has no modules, nothing is at risk, and this is a no-op — which is
  // why it does not break the E2E seed step.
  const emptying: Array<{ slug: string; modules: number; lessons: number; progress: number }> = [];
  for (const c of courses) {
    if (c.modules.length > 0) continue;
    const existing = await prisma.lmsCourse.findUnique({
      where: { slug: c.slug },
      select: { modules: { select: { id: true, lessons: { select: { id: true } } } } },
    });
    const moduleIds = (existing?.modules ?? []).map((m) => m.id);
    if (moduleIds.length === 0) continue;
    const lessonIds = (existing?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
    const progress = lessonIds.length
      ? await prisma.lmsLessonProgress.count({ where: { lessonId: { in: lessonIds } } })
      : 0;
    emptying.push({
      slug: c.slug,
      modules: moduleIds.length,
      lessons: lessonIds.length,
      progress,
    });
  }
  if (emptying.length > 0) {
    console.error(
      `\nrefusing: ${emptying.length} course(s) in this seed have NO modules in the catalogue but` +
        ` DO have curriculum in this database.\n` +
        `  Their curriculum is SAFE — seedCourse skips the delete for a zero-module entry. The\n` +
        `  problem is the opposite one: seeding them cannot update that curriculum at all, so the\n` +
        `  run would report "Seeded course" over content it never touched:\n`
    );
    for (const e of emptying) {
      console.error(
        `    ${e.slug}\n` +
          `      would leave ${e.modules} module(s), ${e.lessons} lesson(s)` +
          `, ${e.progress} learner progress row(s) untouched`
      );
    }
    console.error(
      `\n  These are metadata-only catalogue stubs. Fix the catalogue entries, or seed the` +
        ` courses\n  you actually mean with -- --slug=<slug>. NOTHING has been written.\n` +
        `\n  The safe importer refuses this too and explains per course:` +
        `\n    npm run db:import-course -- --slug=<slug>\n`
    );
    process.exit(1);
  }

  // AFTER the preflight, deliberately. ensureInstructors upserts every catalogue instructor
  // outside any course transaction, so running it first made the refusal above print
  // "NOTHING has been written" when instructor rows had in fact already been committed. The
  // preflight reads only lmsCourse and lmsLessonProgress, so it does not need them; the override
  // check does, because on a fresh database that instructor exists only once this has run.
  await ensureInstructors(data);

  if (override) {
    const inst = await prisma.lmsUser.findUnique({ where: { id: override }, select: { id: true } });
    if (!inst) {
      console.error(`SEED_INSTRUCTOR_ID=${override} not found. Create that user or omit override.`);
      process.exit(1);
    }
  }

  for (const c of courses) {
    await seedCourse(c, override);
    console.log(`Seeded course: ${c.slug}`);
  }

  const done = onlySlug ? `slug "${onlySlug}"` : `${courses.length} course(s)`;
  console.log(`Done. ${done} from ${CATALOG_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
