/**
 * Backfill `lms_courses.cec_hours` from the CEC approvals registry
 * (`data/seed/cec-approvals.json`, the SSOT) / explicit founder-set values via
 * `resolveLmsCourseCecHours`. Nothing is derived from text, duration or reviewer
 * assignments (licence-critical, founder directive 2026-07-09). Never overwrites
 * existing DB values unless --overwrite.
 *
 *   DATABASE_URL="..." npm run db:seed-cec-hours
 *   npm run db:seed-cec-hours -- --overwrite
 *   npm run db:seed-cec-hours -- --dry-run
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';
import { isCecExcludedSlug } from '../src/lib/seed/cec-professional-assignments';
import { resolveLmsCourseCecHours } from '../src/lib/server/course-cec-hours';

const dryRun = process.argv.includes('--dry-run');
const overwrite = process.argv.includes('--overwrite');

async function main() {
  const courses = await prisma.lmsCourse.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      cecHours: true,
      shortDescription: true,
      description: true,
      meta: true,
      durationHours: true,
      iicrcDiscipline: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const stillMissing: string[] = [];

  for (const course of courses) {
    const resolved = resolveLmsCourseCecHours(course);
    if (resolved == null) {
      missing++;
      if (!isCecExcludedSlug(course.slug)) {
        stillMissing.push(course.slug);
      }
      continue;
    }

    const current = course.cecHours != null ? Number(course.cecHours) : null;

    if (!overwrite && current != null && Number.isFinite(current)) {
      skipped++;
      continue;
    }

    if (current === resolved) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.lmsCourse.update({
        where: { id: course.id },
        data: { cecHours: resolved },
      });
    }
    updated++;
    console.log(`  ${course.slug}: ${current ?? '—'} → ${resolved}`);
  }

  console.log(
    dryRun
      ? `Dry run: would update ${updated}, skip ${skipped}, unresolved ${missing} row(s).`
      : `Updated ${updated}, skipped ${skipped}, unresolved ${missing} row(s).`
  );

  if (stillMissing.length > 0) {
    console.log('\nTraining courses still without CEC:');
    for (const slug of stillMissing.sort()) {
      console.log(`  - ${slug}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
