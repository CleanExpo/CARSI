/**
 * Set all WooCommerce-imported catalogue courses (same slug set as `db:seed-wp-export`)
 * to status `draft` and `isPublished: false`. Does not change the 20 pilot courses from
 * `courses-catalog.json` (they are not in that import set).
 *
 * Re-running `npm run db:seed-wp-export` will set them back to published (the seed overwrites status).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run db:set-wp-export-draft
 */
import 'dotenv/config';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';
import { getPublishedWpImportRows } from '../src/lib/seed/wp-export-published-import-slugs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const { rows, excludeSlugs } = getPublishedWpImportRows(APP_ROOT);
  const slugs = rows.map((r) => r.slug);
  if (slugs.length === 0) {
    console.log('No published Woo import slugs from export JSON; nothing to update.');
    return;
  }

  const result = await prisma.lmsCourse.updateMany({
    where: { slug: { in: slugs } },
    data: {
      status: 'draft',
      isPublished: false,
    },
  });

  console.log(
    `Updated ${result.count} course row(s) to draft (expected up to ${slugs.length} from export). Seed overlap exclusions: ${excludeSlugs.size} slug(s).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
