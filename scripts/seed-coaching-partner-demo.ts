/**
 * GP-637 — seed the Business Coaching partner-demo member (see docs/coaching/partner-demo-runsheet.md).
 *
 * DRY RUN BY DEFAULT: prints every write it would make and changes nothing. Add --apply to write.
 *
 *   CARSI_COACHING_DEMO_ENABLED=true DATABASE_URL="postgresql://...@127.0.0.1:5432/carsi" \
 *     npm run db:seed-coaching-partner-demo              # dry run
 *   ... npm run db:seed-coaching-partner-demo -- --apply # write
 *
 * Refuses unless CARSI_COACHING_DEMO_ENABLED is exactly "true" and the database host is local.
 * A disposable PREVIEW database can be named explicitly with --allow-host=<exact host>.
 * Never point this at production. Re-running resets the demo member to the seeded state
 * (that is the "nightly reset"); it never touches any other account.
 *
 * Exit codes: 0 ok · 2 bad arguments · 3 refused by the guard · 4 refused by the data check.
 */
import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import {
  applyPartnerDemoSeed,
  buildPartnerDemoSeedPlan,
  checkPartnerDemoSeedAllowed,
  type PartnerDemoSeedDb,
} from '../src/lib/coaching-portal/partner-demo-seed';

export function parseArgs(argv: string[]): { apply: boolean; allowHost?: string } | { error: string } {
  let apply = false;
  let allowHost: string | undefined;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg.startsWith('--allow-host=')) allowHost = arg.slice('--allow-host='.length).trim();
    else return { error: `unknown argument: ${arg}` };
  }
  if (allowHost === '') return { error: '--allow-host needs a host' };
  return { apply, allowHost };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if ('error' in args) {
    console.error(`seed-coaching-partner-demo: ${args.error}`);
    return 2;
  }
  const guard = checkPartnerDemoSeedAllowed({
    env: process.env,
    databaseUrl: process.env.DATABASE_URL,
    allowHost: args.allowHost,
  });
  if (!guard.ok) {
    console.error(`seed-coaching-partner-demo: REFUSED: ${guard.reason}`);
    return 3;
  }

  const { prisma } = await import('../src/lib/prisma');
  try {
    const report = await applyPartnerDemoSeed(
      prisma as unknown as PartnerDemoSeedDb,
      buildPartnerDemoSeedPlan(new Date()),
      { dryRun: !args.apply }
    );
    console.log(JSON.stringify({ host: guard.host, ...report }, null, 2));
    if (!args.apply) console.log('DRY RUN: nothing was written. Add --apply to write.');
    return 0;
  } catch (err) {
    console.error(`seed-coaching-partner-demo: REFUSED: ${(err as Error).message}`);
    return 4;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code));
}
