/**
 * Live CEC compliance guard (GP-498 recurrence guard) — CLI wrapper.
 *
 * Asserts the connected (prod) DB shows NO unapproved IICRC CEC claims: if any course's
 * stored `cec_hours` disagrees with the approvals registry SSOT — a stale positive that would
 * render an unapproved badge, or an approved course showing the wrong hours — the guard FAILS.
 *
 * This catches drift the repo-file scans (`check:iicrc-compliance`) cannot see, because the
 * GP-498 exposure lived in persisted prod-DB rows, not in the repo.
 *
 *   DATABASE_URL="<PROD>" npx tsx scripts/check-live-cec.ts
 *
 * Exit 0 = clean; exit 1 = unapproved/incorrect CEC claims found, or the check could not run.
 *
 * THE SCHEDULED GUARD NO LONGER RUNS THIS. GitHub's runners cannot reach the production
 * database (trusted-source list is two IPs plus `monkfish-app`), so the nightly job now calls
 * `/api/cron/live-cec-check` on the deployed app instead. Both paths call the same
 * `runLiveCecCheck`, so this remains the correct way to run the guard by hand from a trusted
 * IP, and it cannot drift from what the scheduled job asserts.
 */
import 'dotenv/config';

import { describeDrift, isClean, runLiveCecCheck } from '../src/lib/server/live-cec-check';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set — point it at the live prod DB to run this guard.');
    process.exit(1);
  }

  const { prisma } = await import('../src/lib/prisma');
  try {
    const result = await runLiveCecCheck(prisma as never);
    const driftCount = result.unapproved.length + result.wrongHours.length;

    console.log(
      `Scanned ${result.scanned} courses on the connected DB — ${driftCount} with CEC drift.`
    );
    if (isClean(result)) {
      console.log('✓ Live CEC compliance guard passed — every course matches the approvals registry.');
      return;
    }

    console.error(
      '\n✖ Live CEC compliance guard FAILED — the DB shows CEC claims the registry does not back:'
    );
    for (const line of describeDrift(result)) {
      console.error(`  ${line}`);
    }
    console.error(
      '\nFix: run scripts/clear-unapproved-cec-hours.ts against this DB, or add the genuine ' +
        'approval to data/seed/cec-approvals.json.'
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
