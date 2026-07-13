/**
 * Live CEC compliance guard (GP-498 recurrence guard).
 *
 * Asserts the connected (prod) DB shows NO unapproved IICRC CEC claims. It runs the
 * remediation planner in READ-ONLY mode: if any course's stored `cec_hours` disagrees
 * with the approvals registry SSOT — a stale positive that would render an unapproved
 * badge, or an approved course showing the wrong hours — the guard FAILS.
 *
 * This catches the drift the repo-file scans (`check:iicrc-compliance`) cannot see: the
 * GP-498 exposure lived in persisted prod-DB rows, not in the repo. Robust by
 * construction — it reads the same DB the pages render from and the same planner the
 * remediation writes, so there is no fragile HTML/RSC scraping.
 *
 *   DATABASE_URL="<PROD>" npx tsx scripts/check-live-cec.ts
 *
 * Exit 0 = clean; exit 1 = unapproved/incorrect CEC claims found (offending slugs listed).
 */
import 'dotenv/config';

import { planCecRemediation } from '../src/lib/seed/cec-remediation';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set — point it at the live prod DB to run this guard.');
    process.exit(1);
  }

  const { prisma } = await import('../src/lib/prisma');
  try {
    const courses = await prisma.lmsCourse.findMany({ select: { slug: true, cecHours: true } });
    const drift = planCecRemediation(
      courses.map((c) => ({ slug: c.slug, current: c.cecHours == null ? null : Number(c.cecHours) }))
    );

    console.log(
      `Scanned ${courses.length} courses on the connected DB — ${drift.length} with CEC drift.`
    );
    if (drift.length === 0) {
      console.log('✓ Live CEC compliance guard passed — every course matches the approvals registry.');
      return;
    }

    const unapproved = drift.filter((d) => d.target === 0);
    const wrongHours = drift.filter((d) => d.target > 0);

    console.error(
      '\n✖ Live CEC compliance guard FAILED — the DB shows CEC claims the registry does not back:'
    );
    for (const d of unapproved) {
      console.error(`  ${d.slug}: shows ${d.current} CEC — no IICRC approval in the registry (should be 0)`);
    }
    for (const d of wrongHours) {
      console.error(`  ${d.slug}: shows ${d.current} CEC — registry approves ${d.target}`);
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
