/**
 * FOUNDER-GATED seed skeleton — creates the real 2-day CCW/CARSI workshop
 * `LmsCourse` that the attendance foundation (unit A) reconciles against.
 *
 * This is intentionally a SKELETON. The CEC values are regulatory and MUST NOT
 * be hardcoded by an agent: the founder supplies `--cec-hours` and
 * `--iicrc-discipline` at run time after IICRC approval is confirmed. Without
 * `--cec-hours`, the course is created CEC-DISABLED (cecHours = 0), which the
 * eligibility layer treats as "certificate of attendance only, no CEC".
 *
 * The course slug is the single source of truth in
 * `src/lib/server/ccw-attendance/eligibility.ts` (CCW_2DAY_COURSE_SLUG).
 *
 * Usage (dry-run prints the intended row and exits):
 *   DATABASE_URL=... npx tsx scripts/seed-ccw-2day-course.ts \
 *     --instructor-email founder@example.com
 *
 * Apply (founder, after IICRC approval):
 *   DATABASE_URL=... npx tsx scripts/seed-ccw-2day-course.ts --apply \
 *     --instructor-email founder@example.com \
 *     --cec-hours <FOUNDER_SETS_THIS> \
 *     --iicrc-discipline <FOUNDER_SETS_THIS>
 *
 * Idempotent: re-running upserts the course by slug. It never applies a DB
 * migration and never touches attendance rows.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';

import { prisma } from '../src/lib/prisma';
import { CCW_2DAY_COURSE_SLUG } from '../src/lib/server/ccw-attendance/eligibility';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    const next = process.argv[idx + 1];
    if (!next.startsWith('--')) return next;
  }
  return undefined;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const apply = process.argv.includes('--apply');
  const instructorEmail = getArg('instructor-email');

  // TODO(founder): supply after IICRC approval. Absent => CEC-disabled (0 hrs).
  const cecHoursRaw = getArg('cec-hours');
  const iicrcDiscipline = getArg('iicrc-discipline') ?? null;

  let cecHours = 0; // "not CEC-approved" default — never invent a real number.
  if (cecHoursRaw != null) {
    const parsed = Number(cecHoursRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      console.error(`--cec-hours must be a non-negative number, got: ${cecHoursRaw}`);
      process.exit(1);
    }
    cecHours = parsed;
  }

  if (!instructorEmail) {
    console.error('--instructor-email <email> is required (course.instructorId is NOT NULL).');
    process.exit(1);
  }

  const instructor = await prisma.lmsUser.findUnique({
    where: { email: instructorEmail.trim().toLowerCase() },
    select: { id: true, email: true },
  });
  if (!instructor) {
    console.error(`No LmsUser found for instructor email: ${instructorEmail}`);
    process.exit(1);
  }

  const existing = await prisma.lmsCourse.findUnique({
    where: { slug: CCW_2DAY_COURSE_SLUG },
    select: { id: true, cecHours: true, iicrcDiscipline: true },
  });

  const plan = {
    slug: CCW_2DAY_COURSE_SLUG,
    title: 'CARSI x CCW Business Growth Days (2-Day Workshop)',
    instructorId: instructor.id,
    status: 'published',
    priceAud: 0,
    isFree: true,
    cecHours,
    iicrcDiscipline,
  };

  console.log(existing ? '[exists] will UPDATE course:' : '[new] will CREATE course:');
  console.log(JSON.stringify(plan, null, 2));
  if (cecHours === 0) {
    console.log(
      'NOTE: cecHours = 0 → certificate of attendance only, NO CEC submission. ' +
        'Re-run with --cec-hours <n> --iicrc-discipline <d> once IICRC-approved.',
    );
  }

  if (!apply) {
    console.log('\nDry-run (no --apply). Nothing written.');
    return;
  }

  const course = await prisma.lmsCourse.upsert({
    where: { slug: CCW_2DAY_COURSE_SLUG },
    // Only the founder-gated CEC fields are mutated on update; identity fields
    // are left intact for an already-existing course.
    update: {
      cecHours: plan.cecHours,
      iicrcDiscipline: plan.iicrcDiscipline,
    },
    create: {
      id: randomUUID(),
      slug: plan.slug,
      title: plan.title,
      instructorId: plan.instructorId,
      status: plan.status,
      priceAud: plan.priceAud,
      isFree: plan.isFree,
      cecHours: plan.cecHours,
      iicrcDiscipline: plan.iicrcDiscipline,
    },
    select: { id: true, slug: true, cecHours: true, iicrcDiscipline: true },
  });

  console.log('\nApplied:');
  console.log(JSON.stringify(course, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
