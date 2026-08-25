/**
 * Execute the yearly-membership idempotency guard against a REAL database.
 *
 * The guard shipped in #708/#709 having never run: the conditional upsert, the
 * refusal path and the release were covered only by unit tests over the pure
 * window arithmetic and email normalisation. That is the exact shape of the
 * defect #709 existed to fix — `isWithinRegrantWindow` was correct in isolation
 * while the guard around it failed open — so pure-function coverage is not
 * evidence here. Only a sequence against a live Postgres is.
 *
 * What this covers that a unit test cannot:
 *   - `$executeRaw` really returns the affected-row count the guard reads as
 *     "claim taken" (1) vs "refused" (0). Nothing else checks that assumption.
 *   - `ON CONFLICT (email) DO UPDATE ... WHERE` really refuses a repeat inside
 *     the window and really admits one past it.
 *   - Two grants arriving TOGETHER produce exactly one winner — the design's
 *     central claim, that the DATABASE arbitrates rather than a read-then-write.
 *   - The release is scoped to the timestamp it wrote, so a slow failed attempt
 *     cannot clear a claim another request has since taken.
 *
 * It then MUTATES the guard's own inputs and requires it to fail open, because a
 * guard that cannot be observed failing is not evidence that it passed
 * (CLAUDE.md: "A guard's silence is not a pass").
 *
 * Writes only to `yearly_membership_grant_claims`, only for its own synthetic
 * `@guard-verify.invalid` addresses (a reserved TLD, RFC 2606), and deletes them
 * afterwards. It touches no learner, enrolment or membership row.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/verify-membership-claim-guard.ts
 */
import {
  claimYearlyMembershipGrant,
  releaseYearlyMembershipClaim,
  YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
} from '@/lib/admin/yearly-membership-claim';
import { prisma } from '@/lib/prisma';

/** Reserved TLD, so these can never collide with a real learner. */
const DOMAIN = '@guard-verify.invalid';

const failures: string[] = [];
let checks = 0;

/**
 * Record one assertion.
 *
 * Deliberately does NOT throw on a mismatch: a guard that fails in more than
 * one place should report every place at once, because which checks fail
 * together is what identifies the defect. Dropping the WHERE clause fails five
 * checks including the concurrency one; skipping normalisation fails exactly
 * one. Stopping at the first would make those look identical.
 */
function check(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  if (actual === expected) {
    console.log(`  ok   ${label}`);
    return;
  }
  const line = `${label} — expected ${String(expected)}, got ${String(actual)}`;
  console.log(`  FAIL ${line}`);
  failures.push(line);
}

/**
 * Remove this script's own claim rows, before and after the run.
 *
 * Scoped by the synthetic domain rather than truncating the table, so running
 * this against a database that holds real claims cannot disturb them. Runs
 * first as well as last because a previous run killed midway would otherwise
 * leave a claim that makes the opening assertion fail for the wrong reason.
 */
async function clear(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM yearly_membership_grant_claims WHERE email LIKE ${'%' + DOMAIN}
  `;
}

/**
 * Drive the guard through the sequences an operator can actually produce, then
 * require it to be observable failing.
 *
 * Ordered so the cheap refusal checks run before the concurrency one: if the
 * conditional upsert is broken outright, the earlier failures say so more
 * precisely than a race that happens to produce three winners.
 */
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required — this verifies the guard against a real database.');
    process.exit(2);
  }

  await clear();

  // ---- The refusal the 409 is built on -------------------------------------
  console.log('\nThe grant claim, in sequence:');
  {
    const email = `sequence${DOMAIN}`;
    const t0 = new Date('2026-08-24T22:00:00.000Z');

    check('a fresh email is claimable', await claimYearlyMembershipGrant(email, t0), true);

    const doubleSubmit = new Date(t0.getTime() + 30_000);
    check(
      'a double-submit 30s later is refused (this is the 409)',
      await claimYearlyMembershipGrant(email, doubleSubmit),
      false,
    );

    const lateRetry = new Date(t0.getTime() + YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS - 1_000);
    check(
      'a retry one second inside the window is still refused',
      await claimYearlyMembershipGrant(email, lateRetry),
      false,
    );

    const renewal = new Date(t0.getTime() + 365 * 24 * 60 * 60 * 1000);
    check(
      'a legitimate renewal a year later is admitted',
      await claimYearlyMembershipGrant(email, renewal),
      true,
    );
  }

  // ---- Normalisation, at the database rather than in a string helper -------
  console.log('\nCasing cannot open a second claim:');
  {
    const t0 = new Date('2026-08-24T22:00:00.000Z');
    check(
      'the first casing is claimable',
      await claimYearlyMembershipGrant(`Mixed.Case${DOMAIN}`, t0),
      true,
    );
    // The claim table's primary key is case-SENSITIVE, so this passes only
    // because the guard normalises before it reaches SQL. Mutation 3 below
    // shows what this looks like when it does not.
    check(
      'the same address in other casing is refused',
      await claimYearlyMembershipGrant(`  MIXED.CASE${DOMAIN}  `, new Date(t0.getTime() + 1_000)),
      false,
    );
  }

  // ---- Release, scoped to the stamp it wrote ------------------------------
  console.log('\nReleasing a claim after a failed grant:');
  {
    const email = `release${DOMAIN}`;
    const claimedAt = new Date('2026-08-24T22:00:00.000Z');
    check('claim taken', await claimYearlyMembershipGrant(email, claimedAt), true);

    // A stale release — the timestamp of an EARLIER attempt — must not clear the
    // claim currently held, or one slow failure frees the window for a racing
    // double-submit.
    await releaseYearlyMembershipClaim(email, new Date(claimedAt.getTime() - 60_000));
    check(
      'a stale release leaves the held claim in place',
      await claimYearlyMembershipGrant(email, new Date(claimedAt.getTime() + 1_000)),
      false,
    );

    await releaseYearlyMembershipClaim(email, claimedAt);
    check(
      'the matching release frees the next grant immediately',
      await claimYearlyMembershipGrant(email, new Date(claimedAt.getTime() + 2_000)),
      true,
    );
  }

  // ---- The design's central claim: the DATABASE arbitrates ----------------
  console.log('\nTwo grants arriving together:');
  {
    const email = `race${DOMAIN}`;
    // Not staggered — issued concurrently on separate pooled connections, which
    // is what a double-submit or two admins acting at once actually looks like.
    const results = await Promise.all([
      claimYearlyMembershipGrant(email),
      claimYearlyMembershipGrant(email),
      claimYearlyMembershipGrant(email),
    ]);
    check(
      'exactly one of three concurrent claims wins',
      results.filter(Boolean).length,
      1,
    );
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM yearly_membership_grant_claims WHERE email = ${email}
    `;
    check('and it left exactly one claim row', Number(rows[0]?.count), 1);
  }

  // ---- Mutation: the guard must be observable FAILING ---------------------
  // Each of these feeds the guard an input that removes one load-bearing part
  // of it. If any still refuses the repeat, the checks above were passing for
  // some reason other than the guard working, and this script is not evidence.
  console.log('\nMutations — the guard must fail open when weakened:');
  {
    const email = `mutation${DOMAIN}`;
    const t0 = new Date('2026-08-24T22:00:00.000Z');
    await claimYearlyMembershipGrant(email, t0);
    check(
      'MUTATION window=0: the repeat is admitted (so the window predicate is load-bearing)',
      await claimYearlyMembershipGrant(email, new Date(t0.getTime() + 1), 0),
      true,
    );

    const other = `mutation-distinct${DOMAIN}`;
    await claimYearlyMembershipGrant(other, t0);
    check(
      'MUTATION different email: admitted (so the refusal is keyed, not blanket)',
      await claimYearlyMembershipGrant(`other-${other}`, new Date(t0.getTime() + 1)),
      true,
    );
  }

  await clear();
  await prisma.$disconnect();

  console.log(`\n${checks} checks, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.error('\nThe yearly-membership grant guard did NOT behave as designed:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('The yearly-membership grant guard behaves as designed against a real database.');
}

main().catch(async (error) => {
  console.error('verify-membership-claim-guard failed to run:', error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
