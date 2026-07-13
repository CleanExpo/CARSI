/**
 * FOUNDER-GATED seed skeleton — creates the real 2-day CCW/CARSI workshop
 * `LmsCourse` that the attendance foundation (unit A) reconciles against.
 *
 * This course promotes CCW commercial products, so IICRC will NOT grant CECs:
 * the course is created free + unlisted with NO CEC. There is deliberately no
 * `--cec-hours` / `--iicrc-discipline` setup here — attending both days yields a
 * plain certificate of attendance (issued by the async attendance batch), never
 * a CEC/IICRC submission. (The broader CARSI CEC system still serves OTHER,
 * IICRC-approved courses; it is simply not wired to this workshop.)
 *
 * The course slug is the single source of truth in
 * `src/lib/server/ccw-attendance/eligibility.ts` (CCW_2DAY_COURSE_SLUG).
 *
 * Usage (dry-run prints the intended row and exits):
 *   DATABASE_URL=... npx tsx scripts/seed-ccw-2day-course.ts \
 *     --instructor-email founder@example.com
 *
 * Apply (founder):
 *   DATABASE_URL=... npx tsx scripts/seed-ccw-2day-course.ts --apply \
 *     --instructor-email founder@example.com
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
    select: { id: true, slug: true, status: true },
  });

  const plan = {
    slug: CCW_2DAY_COURSE_SLUG,
    title: 'CARSI x CCW Business Growth Days (2-Day Workshop)',
    instructorId: instructor.id,
    // Unlisted: not surfaced in the public catalog (which only lists
    // status='published'); attendees receive access via the attendance batch.
    status: 'unlisted',
    priceAud: 0,
    isFree: true,
  };

  console.log(existing ? '[exists] will UPDATE course:' : '[new] will CREATE course:');
  console.log(JSON.stringify(plan, null, 2));
  console.log(
    'NOTE: this course promotes CCW commercial products → NO CEC. Both days yields ' +
      'a certificate of attendance only, never a CEC/IICRC submission.',
  );

  if (!apply) {
    console.log('\nDry-run (no --apply). Nothing written.');
    return;
  }

  const course = await prisma.lmsCourse.upsert({
    where: { slug: CCW_2DAY_COURSE_SLUG },
    // Identity fields are left intact for an already-existing course; this seed
    // never mutates CEC fields (the workshop grants none).
    update: {},
    create: {
      id: randomUUID(),
      slug: plan.slug,
      title: plan.title,
      instructorId: plan.instructorId,
      status: plan.status,
      priceAud: plan.priceAud,
      isFree: plan.isFree,
    },
    select: { id: true, slug: true, status: true, isFree: true },
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
