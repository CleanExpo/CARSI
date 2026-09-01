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

/**
 * The denied enrolments that actually count against the grant's contract: those on a course
 * that is currently published.
 *
 * Scoping matters. A learner can hold a revoked enrolment on a course that has since been
 * retired or unpublished; that row is worth reporting, but it says nothing about whether they
 * have access to every course on offer today. Counting it would leave the grant permanently
 * incomplete with no action able to fix it.
 *
 * Slugs are normalised on both sides because `slug` is free text, matching how the rest of the
 * admin grant path (`adminGrantEnrollment`, `listPublishedCourseSlugsForYearlyMembership`)
 * lower-cases and trims before comparing.
 */
export function deniedPublishedCourses<T extends EnrolmentAccessRow>(
  denied: readonly T[],
  publishedSlugs: Iterable<string>
): T[] {
  return publishedCourseAccess(denied, publishedSlugs).denied;
}

/**
 * Split a learner's enrolments into the published courses they can actually reach and the
 * published courses they cannot, judged with the WS3 predicate.
 *
 * `reachable` is ground truth rather than arithmetic. Counting "granted + already enrolled"
 * overstates access, because `adminGrantEnrollment` reports a revoked row as `already_enrolled`
 * — so any figure derived from those tallies (a total, an email's course count) can promise
 * courses the gates deny. Ask the rows.
 *
 * Enrolments on courses that are not currently published are excluded from BOTH sides: they are
 * neither part of what a membership offers today nor a failure it can remediate.
 */
export function publishedCourseAccess<T extends EnrolmentAccessRow>(
  rows: readonly T[],
  publishedSlugs: Iterable<string>
): { reachable: T[]; denied: T[] } {
  const normalise = (slug: string) => slug.trim().toLowerCase();
  const published = new Set([...publishedSlugs].map(normalise));

  const reachable: T[] = [];
  const denied: T[] = [];
  for (const row of rows) {
    if (!published.has(normalise(row.course.slug))) continue;
    (isEnrolmentAccessAllowed(row.status) ? reachable : denied).push(row);
  }
  return { reachable, denied };
}

/** Tally of one grant run, as the per-course loop accumulates it. */
export interface GrantOutcome {
  created: number;
  alreadyEnrolled: number;
  failed: number;
  /**
   * Published courses whose enrolment row exists but is denied by the read gates (revoked,
   * refunded, disputed...). Not a failure of the run — the row was left alone on purpose —
   * but the learner still cannot reach the course.
   */
  deniedAccess: number;
}

/**
 * True only when the learner can actually reach every published course.
 *
 * Two distinct ways to fall short, and both must count:
 *
 *  - `failed`       — the grant call threw, so no enrolment exists.
 *  - `deniedAccess` — an enrolment exists but the gates deny it. `adminGrantEnrollment`
 *                     returns `already_enrolled` for ANY existing row without inspecting its
 *                     status, so a revoked enrolment is tallied under `alreadyEnrolled` and
 *                     leaves `failed` at zero.
 *
 * Counting only `failed` let the script print a course under NO ACCESS and exit 0 in the same
 * breath. Deciding not to auto-reactivate a revoked row (its `revokedReason` carries
 * dispute/refund meaning) is not the same as deciding the grant succeeded.
 */
export function isGrantComplete(outcome: GrantOutcome): boolean {
  return outcome.failed === 0 && outcome.deniedAccess === 0;
}

/** Process exit code for a run: 0 only when the grant is complete. */
export function grantExitCode(outcome: GrantOutcome): 0 | 1 {
  return isGrantComplete(outcome) ? 0 : 1;
}
