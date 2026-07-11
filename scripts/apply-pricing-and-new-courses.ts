/**
 * Surgical, MANUAL-ONLY production apply for the 2026-07-12 pricing + new-course work.
 *
 * WHY THIS EXISTS (do not replace with `db:seed-courses`):
 *   `npm run db:seed-courses` upserts the WHOLE catalogue export over the live DB. The live DB is
 *   the source of truth for course content (titles, descriptions, modules) — a blanket re-seed
 *   would overwrite manually-curated prod rows (the GP-503 data-loss incident; memory
 *   carsi_deploy_course_seed_data_loss). This script instead:
 *     - EXISTING courses: updates ONLY price_aud + is_free by slug. Never touches title,
 *       description, modules, thumbnails, duration or publish state.
 *     - NEW courses (6 "Grow Your Business"): inserts them as draft/unpublished scaffolds only if
 *       the slug does not already exist. Never overwrites an existing row.
 *   It never deletes anything.
 *
 * USAGE (prod is founder-gated — supply the prod connection string):
 *   DATABASE_URL="postgresql://…prod…" npx tsx scripts/apply-pricing-and-new-courses.ts          # dry-run (default)
 *   DATABASE_URL="postgresql://…prod…" npx tsx scripts/apply-pricing-and-new-courses.ts --commit  # apply
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/lib/prisma';

const COMMIT = process.argv.includes('--commit');
const CATALOG = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Supply the prod connection string (founder-gated).');
  }
  const doc = JSON.parse(readFileSync(CATALOG, 'utf8')) as { courses: any[] };
  const priceUpdates: string[] = [];
  const inserts: string[] = [];
  const skipped: string[] = [];

  for (const c of doc.courses) {
    const existing = await prisma.lmsCourse.findUnique({ where: { slug: c.slug }, select: { id: true, priceAud: true, isFree: true } });
    if (existing) {
      const newPrice = String(c.priceAud);
      const changed = String(existing.priceAud) !== newPrice || existing.isFree !== c.isFree;
      if (!changed) { skipped.push(`${c.slug} (price already ${newPrice})`); continue; }
      priceUpdates.push(`${c.slug}: $${String(existing.priceAud)} -> $${newPrice} | isFree ${existing.isFree} -> ${c.isFree}`);
      if (COMMIT) {
        await prisma.lmsCourse.update({
          where: { slug: c.slug },
          data: { priceAud: newPrice, isFree: c.isFree }, // price + is_free ONLY — content untouched
        });
      }
    } else {
      inserts.push(`${c.slug} ($${c.priceAud}, ${c.category ?? 'null'}, draft/unpublished)`);
      if (COMMIT) {
        await prisma.lmsCourse.create({
          data: {
            id: c.id,
            slug: c.slug,
            title: c.title,
            description: c.description ?? null,
            shortDescription: c.shortDescription ?? null,
            thumbnailUrl: c.thumbnailUrl ?? null,
            instructorId: c.instructorId,
            status: c.status ?? 'draft',
            priceAud: String(c.priceAud),
            isFree: c.isFree ?? false,
            durationHours: c.durationHours ?? null,
            level: c.level ?? null,
            category: c.category ?? null,
            tags: c.tags ?? undefined,
            iicrcDiscipline: c.iicrcDiscipline ?? null,
            cecHours: c.cecHours ?? 0, // fail-closed
            meta: c.meta ?? undefined,
            isPublished: c.isPublished ?? false,
          },
        });
      }
    }
  }

  const line = (label: string, arr: string[]) => { console.log(`\n${label} (${arr.length}):`); arr.forEach(x => console.log('  ' + x)); };
  line('PRICE UPDATES (existing rows, price+is_free only)', priceUpdates);
  line('NEW COURSE INSERTS (draft/unpublished)', inserts);
  console.log(`\nUnchanged: ${skipped.length}`);
  console.log(COMMIT ? '\n✅ COMMITTED to the connected database.' : '\n(DRY RUN — re-run with --commit to apply. No writes made.)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
