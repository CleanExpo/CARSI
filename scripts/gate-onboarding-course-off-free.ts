/**
 * WS1-E3 (GP-443): flip the CARSI Maintenance Company Onboarding course(s) OFF
 * `isFree` once the organisation subscription gate is live.
 *
 * WHY A SCRIPT, NOT A MIGRATION: `isFree` is per-course DATA (an `lms_courses`
 * column), not schema. The production DB is firewalled locally and this change
 * must NEVER strand a learner — so it is an explicit, reversible ops action run
 * ONLY after (a) SUBSCRIPTIONS_ENABLED is on, (b) the org-monthly Stripe Price
 * exists, and (c) at least one paying/provisioned org exists (or a grace window
 * is agreed). Direct onboarding enrolment is already gated to org members
 * (app/api/lms/onboarding/[slug]/enroll → 402 for non-members), so flipping
 * `isFree` here removes the "free" affordance without breaking access for
 * entitled org members.
 *
 * Usage (run against the target DB by ops, never in CI):
 *   DATABASE_URL="..." npx tsx scripts/gate-onboarding-course-off-free.ts --dry-run
 *   DATABASE_URL="..." npx tsx scripts/gate-onboarding-course-off-free.ts
 *   DATABASE_URL="..." npx tsx scripts/gate-onboarding-course-off-free.ts --revert
 *
 * Reversible: `--revert` restores `isFree = true` for the same course set.
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma';
import { ONBOARDING_BRAND, FLOOR_CARE_ONBOARDING_SLUG } from '../src/lib/onboarding/enterprise';

const dryRun = process.argv.includes('--dry-run');
const revert = process.argv.includes('--revert');

async function main() {
  const target = revert ? true : false;

  const courses = await prisma.lmsCourse.findMany({
    where: {
      OR: [
        { category: { equals: ONBOARDING_BRAND, mode: 'insensitive' } },
        { slug: FLOOR_CARE_ONBOARDING_SLUG },
      ],
    },
    select: { id: true, slug: true, title: true, isFree: true },
  });

  if (courses.length === 0) {
    console.log('No CARSI Maintenance Company Onboarding courses found. Nothing to do.');
    return;
  }

  console.log(
    `${revert ? 'Reverting to isFree=true' : 'Gating off isFree (isFree=false)'} for ${courses.length} onboarding course(s):`,
  );
  let changed = 0;
  for (const c of courses) {
    const willChange = c.isFree !== target;
    console.log(`  - ${c.slug} (isFree ${c.isFree} → ${target})${willChange ? '' : ' [no change]'}`);
    if (willChange && !dryRun) {
      await prisma.lmsCourse.update({ where: { id: c.id }, data: { isFree: target } });
      changed++;
    } else if (willChange) {
      changed++;
    }
  }

  console.log(
    dryRun
      ? `\nDRY RUN — would change ${changed} course(s). Re-run without --dry-run to apply.`
      : `\nDone — changed ${changed} course(s).`,
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
