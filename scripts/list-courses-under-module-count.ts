/**
 * List courses with fewer than N modules (default: 5).
 *
 * Usage:
 *   npx tsx scripts/list-courses-under-module-count.ts
 *   npx tsx scripts/list-courses-under-module-count.ts --min 5
 *   npx tsx scripts/list-courses-under-module-count.ts --all
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';

function parseMinModules(argv: string[]): number {
  const idx = argv.indexOf('--min');
  if (idx === -1) return 5;
  const n = Number(argv[idx + 1]);
  if (!Number.isFinite(n) || n < 0) {
    console.error('Invalid --min value');
    process.exit(1);
  }
  return n;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const minModules = parseMinModules(process.argv);
  const includeAll = process.argv.includes('--all');

  const publishedWhere = {
    OR: [
      { isPublished: true },
      { status: { equals: 'published', mode: 'insensitive' as const } },
    ],
  };

  const courses = await prisma.lmsCourse.findMany({
    where: includeAll ? undefined : publishedWhere,
    orderBy: { slug: 'asc' },
    select: {
      slug: true,
      title: true,
      status: true,
      isPublished: true,
      iicrcDiscipline: true,
      _count: { select: { modules: true } },
    },
  });

  const filtered = courses
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      status: c.status,
      published: c.isPublished ?? false,
      discipline: c.iicrcDiscipline,
      moduleCount: c._count.modules,
    }))
    .filter((c) => c.moduleCount < minModules);

  console.log(
    JSON.stringify(
      {
        scope: includeAll ? 'all courses in database' : 'published catalogue courses only',
        threshold: minModules,
        totalInScope: courses.length,
        matchingCount: filtered.length,
        courses: filtered,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
