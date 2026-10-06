/**
 * Remove the auto-materialised seed placeholder courses (the "(…-aligned)" pilot
 * set from src/lib/lms-seed-catalog.ts). Safe to re-run; deletion cascades to
 * modules, lessons, enrollments, progress and reviews via schema onDelete rules.
 *
 * These courses were historically resurrected by getOrCreateCourseBySlug() on
 * routine traffic. That path is now gated behind LMS_SEED_AUTOCREATE=1, so a
 * deletion finally sticks. Note `wrt-water-damage-essentials` is also present in
 * data/seed/courses-catalog.json — an explicit `npm run db:seed-courses` run
 * would recreate that one course.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/cleanup-placeholder-seed-courses.ts          # dry-run
 *   DATABASE_URL=... npx tsx scripts/cleanup-placeholder-seed-courses.ts --apply  # delete
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';

const PLACEHOLDER_SLUGS = [
  'wrt-water-damage-essentials',
  'asd-structural-drying-core',
  'amrt-microbial-remediation-core',
  'fsrt-fire-smoke-restoration-core',
  'cct-commercial-carpet-core',
  'restoration-project-management-premium',
];

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');

  const rows = await prisma.lmsCourse.findMany({
    where: { slug: { in: PLACEHOLDER_SLUGS } },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { modules: true, enrollments: true } },
    },
    orderBy: { slug: 'asc' },
  });

  if (rows.length === 0) {
    console.log('No placeholder seed courses found — nothing to delete.');
    return;
  }

  console.log(`${apply ? 'Deleting' : 'Would delete'} ${rows.length} course(s):\n`);
  for (const r of rows) {
    console.log(
      `  ${r.slug}\n    "${r.title}" — ${r.status}, ${r._count.modules} modules, ` +
        `${r._count.enrollments} enrolment(s), created ${r.createdAt.toISOString().slice(0, 10)}`
    );
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to delete.');
    return;
  }

  const result = await prisma.lmsCourse.deleteMany({
    where: { slug: { in: PLACEHOLDER_SLUGS } },
  });
  console.log(`\nDeleted ${result.count} course row(s); dependants removed by cascade.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
