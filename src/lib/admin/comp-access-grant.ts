/**
 * Pure decision logic for a complimentary "every published course" access grant
 * (`scripts/grant-toby-comp-access.ts`).
 *
 * WHY THIS FILE EXISTS: three defects shipped in the original script, and all three were
 * in decisions like the ones below rather than in the database calls around them — an exit
 * rule that reported partial failure as success, an account path that left a deactivated
 * user locked out, and a report that restated an access predicate instead of reusing it.
 * Inline in `main()` none of them were reachable by a test. Extracted here they are, and
 * `comp-access-grant.test.ts` pins each one.
 *
 * Pure + dependency-free on purpose, mirroring `enrollment-access.ts`: no Prisma, no env,
 * no IO. The script keeps the IO; this file keeps the decisions.
 */
import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';

/** What the grant must do with the learner's account before enrolling them. */
export type AccountAction =
  /** No row yet — create one (and issue a temporary password). */
  | 'create'
  /** Row exists but is deactivated — reactivate, or the enrolments are unreachable. */
  | 'reactivate'
  /** Row exists and is already active — leave it completely alone. */
  | 'reuse';

/**
 * Decide how to handle the learner's account.
 *
 * `reactivate` is not cosmetic: `authenticateWithPassword` and `sessionClaimsForUserId`
 * both return null for an inactive user, so enrolments granted to a deactivated account
 * cannot be used. The grant would otherwise report complete while sign-in still failed.
 *
 * Note what this deliberately does NOT decide: the password. An existing account keeps its
 * password on every path, so re-running can never lock the learner out.
 */
export function accountActionFor(user: { isActive: boolean } | null | undefined): AccountAction {
  if (!user) return 'create';
  return user.isActive ? 'reuse' : 'reactivate';
}

/** Minimal shape of an enrolment row needed to judge whether it grants access. */
export interface EnrolmentAccessRow {
  status: string | null | undefined;
  revokedReason?: string | null;
  course: { slug: string };
}

/**
 * The enrolments that exist but do NOT grant access, judged with the same WS3 predicate the
 * read gates use.
 *
 * Reusing `isEnrolmentAccessAllowed` rather than restating it (e.g. `status !== 'active'`, or
 * a Prisma `notIn`) is the point. The allow-set is {active, completed}, so a narrower rule
 * flags every COMPLETED course as locked-out, and `status` is a free-text column, so it also
 * has to survive case and surrounding whitespace. Restating the rule anywhere lets this report
 * disagree with the gates it is reporting on.
 */
export function enrolmentsWithoutAccess<T extends EnrolmentAccessRow>(rows: readonly T[]): T[] {
  return rows.filter((row) => !isEnrolmentAccessAllowed(row.status));
}

/** Tally of one grant run, as the per-course loop accumulates it. */
export interface GrantOutcome {
  created: number;
  alreadyEnrolled: number;
  failed: number;
}

/**
 * True only when every published course was granted.
 *
 * The contract is access to EVERY published course, so a single failure means the grant is
 * incomplete — even alongside many successes. Gating this on "every course failed" (the
 * original `failed && created === 0 && already === 0`) reported 24-of-25 as success, and an
 * operator or wrapper reading the exit status saw a clean run.
 */
export function isGrantComplete(outcome: GrantOutcome): boolean {
  return outcome.failed === 0;
}

/** Process exit code for a run: 0 only when the grant is complete. */
export function grantExitCode(outcome: GrantOutcome): 0 | 1 {
  return isGrantComplete(outcome) ? 0 : 1;
}
