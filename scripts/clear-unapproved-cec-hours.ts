/**
 * Converge `lms_courses.cec_hours` to the CEC approvals registry SSOT (GP-498).
 *
 * Clears the stale, derived CEC claims left in the prod DB after the fail-closed cutover
 * (founder directive 2026-07-09): every course WITHOUT a recorded IICRC approval is set to
 * 0 (the explicit "not approved" opt-out — renders no badge), and any course WITH a registry
 * approval is set to its recorded hours. Only the `cec_hours` column is touched.
 *
 * Unlike `seed-course-cec-hours.ts` (a backfill tool that skips rows whose stored positive
 * already "looks approved"), this pass derives the target from the registry ALONE, so it
 * actually removes unapproved claims. Idempotent: re-running changes nothing once converged.
 *
 * Run against the LIVE DO prod DB with the real connection string (this repo's local .env
 * points at the wrong database). Dry-run first:
 *
 *   DATABASE_URL="<PROD>" npx tsx scripts/clear-unapproved-cec-hours.ts --dry-run
 *   DATABASE_URL="<PROD>" npx tsx scripts/clear-unapproved-cec-hours.ts
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';
import { planCecRemediation } from '../src/lib/seed/cec-remediation';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const courses = await prisma.lmsCourse.findMany({
    select: { id: true, slug: true, cecHours: true },
  });

  const idBySlug = new Map(courses.map((c) => [c.slug, c.id]));
  const plan = planCecRemediation(
    courses.map((c) => ({ slug: c.slug, current: c.cecHours == null ? null : Number(c.cecHours) }))
  );

  const zeroed = plan.filter((p) => p.target === 0);
  const backfilled = plan.filter((p) => p.target > 0);

  for (const p of plan) {
    console.log(`  ${p.slug}: ${p.current ?? '—'} → ${p.target}`);
    if (!dryRun) {
      await prisma.lmsCourse.update({
        where: { id: idBySlug.get(p.slug)! },
        data: { cecHours: p.target },
      });
    }
  }

  console.log(
    `\n${dryRun ? 'Dry run: would change' : 'Changed'} ${plan.length} course(s) — ` +
      `${zeroed.length} unapproved cleared to 0, ${backfilled.length} set to a registry-approved ` +
      `value. ${courses.length - plan.length} of ${courses.length} already correct.`
  );
  if (dryRun && plan.length > 0) {
    console.log('Re-run without --dry-run to apply.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
