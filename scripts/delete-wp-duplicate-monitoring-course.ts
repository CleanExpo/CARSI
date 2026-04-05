/**
 * One-off cleanup: remove Woo duplicate that matched seed "documenting/reporting"
 * before slug `introduction-to-monitoring-air-quality-job-site` was excluded.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/delete-wp-duplicate-monitoring-course.ts
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';

const SLUG = 'introduction-to-monitoring-air-quality-job-site';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const result = await prisma.lmsCourse.deleteMany({
    where: { slug: SLUG },
  });

  if (result.count === 0) {
    console.log(`No row with slug "${SLUG}" — nothing to delete.`);
  } else {
    console.log(`Deleted ${result.count} course row(s) with slug "${SLUG}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
