/**
 * Idempotency for the admin yearly-membership grant.
 *
 * `grantYearlyMembership` ROTATES an existing member's password and reveals the
 * new one only in the welcome email. A second grant therefore invalidates the
 * credentials the first email just delivered — so a double-submit, a retry after
 * a timeout, or two admins acting at once locks the member out of an account
 * that was working. The CCW comp path has been guarded since its own migration;
 * `POST /api/admin/yearly-membership` had no guard at all.
 *
 * A WINDOW rather than a permanent lock, unlike the CCW comp. That path issues a
 * one-off comp for a named attendee, so set-if-null is right there. A yearly
 * membership is renewed by design: refusing forever would block a legitimate
 * renewal and leave no way to issue one. The window is sized to the hazard —
 * accidental repeats happen within seconds or minutes, deliberate renewals do
 * not.
 */
import { prisma } from '@/lib/prisma';

/**
 * How long a grant blocks the next one for the same learner.
 *
 * Long enough to cover a slow grant plus an impatient retry — the grant enrols
 * across the whole published catalogue and then sends mail, so it is not fast —
 * and far short of any legitimate re-grant.
 */
export const YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS = 10 * 60 * 1000;

export type YearlyMembershipClaim =
  | { claimed: true }
  /** A grant for this learner landed inside the window; `at` is when. */
  | { claimed: false; previousGrantAt: Date };

/**
 * PURE, so the window rule is testable without a database.
 *
 * `null` — never granted by this path — always admits. That matters for the
 * migration: every existing row starts NULL, so no current member is locked out
 * by the column being added.
 */
export function isWithinRegrantWindow(
  previousGrantAt: Date | null,
  now: Date,
  windowMs: number = YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
): boolean {
  if (previousGrantAt === null) return false;
  const elapsed = now.getTime() - previousGrantAt.getTime();
  // A negative elapsed means the stored stamp is in the FUTURE — clock skew, or
  // a stamp written by a host running ahead. Treat it as inside the window: the
  // safe direction is to refuse and make an operator look, exactly as the comp
  // path refuses rather than guesses.
  return elapsed < windowMs;
}

/**
 * Claim the right to grant, atomically.
 *
 * The conditional UPDATE is what makes this safe: the DATABASE decides the
 * winner, so two requests arriving together cannot both proceed. A read-then-
 * write could not — it is the same reason the CCW path stopped inferring its
 * duplicate check from enrolment payment references.
 *
 * A learner with no account yet cannot have been granted before, so there is no
 * row to claim on and the grant proceeds. That leaves NOTHING STAMPED, which is
 * why `recordYearlyMembershipGrant` must run after a successful grant: without
 * it the first grant to a new email leaves the column null and the SECOND one is
 * admitted, rotating the password again — the exact lockout this guard exists to
 * prevent, on the path that matters most, since granting to someone who has no
 * account yet is the ordinary case for this form.
 *
 * Two concurrent grants for the same NEW email both pass here and race on
 * `lmsUser.create`; one wins and the other throws a unique-constraint error
 * before rotating anything. That is a worse error message, not a lockout, and it
 * is the pre-existing behaviour.
 */
export async function claimYearlyMembershipGrant(
  email: string,
  now: Date = new Date(),
  windowMs: number = YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
): Promise<YearlyMembershipClaim> {
  const normalised = email.trim().toLowerCase();
  const existing = await prisma.lmsUser.findUnique({
    where: { email: normalised },
    select: { id: true, yearlyMembershipGrantedAt: true },
  });

  if (!existing) return { claimed: true };

  if (isWithinRegrantWindow(existing.yearlyMembershipGrantedAt, now, windowMs)) {
    return { claimed: false, previousGrantAt: existing.yearlyMembershipGrantedAt as Date };
  }

  const cutoff = new Date(now.getTime() - windowMs);
  const { count } = await prisma.lmsUser.updateMany({
    where: {
      id: existing.id,
      OR: [{ yearlyMembershipGrantedAt: null }, { yearlyMembershipGrantedAt: { lt: cutoff } }],
    },
    data: { yearlyMembershipGrantedAt: now },
  });

  // Zero rows means another request claimed it between the read above and this
  // write. The read said we were clear; the database says otherwise, and the
  // database is right.
  if (count === 1) return { claimed: true };
  return { claimed: false, previousGrantAt: now };
}

/**
 * Give the claim back when the grant did not happen.
 *
 * Scoped to the exact timestamp this call wrote, so a claim another request has
 * since taken is never cleared. Without this, one failed attempt would block the
 * learner for the whole window for no reason.
 */
export async function releaseYearlyMembershipClaim(email: string, claimedAt: Date): Promise<void> {
  try {
    await prisma.lmsUser.updateMany({
      where: { email: email.trim().toLowerCase(), yearlyMembershipGrantedAt: claimedAt },
      data: { yearlyMembershipGrantedAt: null },
    });
  } catch (error) {
    // No learner identifier in the log line (CWE-532 was paid for once on this
    // code path already).
    console.error('[yearly-membership] claim release failed:', error);
  }
}

/**
 * Stamp the claim after a grant that actually happened.
 *
 * Required because `claimYearlyMembershipGrant` cannot stamp a row that does not
 * exist yet. For a learner who already had an account the claim wrote this same
 * timestamp and this is a no-op; for a NEW account it is the only write, and
 * without it the guard never engages for that learner at all.
 *
 * Keyed on email rather than id because the grant creates the row and the caller
 * does not hold its id. Never throws: the grant has already succeeded and the
 * member has their credentials, so failing the response here would report a
 * disaster that did not happen. It is logged loudly instead, because the silent
 * outcome is an unguarded learner.
 */
export async function recordYearlyMembershipGrant(email: string, at: Date): Promise<void> {
  try {
    const { count } = await prisma.lmsUser.updateMany({
      where: { email: email.trim().toLowerCase() },
      data: { yearlyMembershipGrantedAt: at },
    });
    if (count !== 1) {
      // No learner identifier in the log line (CWE-532).
      console.error('[yearly-membership] grant stamp matched no row — learner is unguarded');
    }
  } catch (error) {
    console.error('[yearly-membership] grant stamp failed — learner is unguarded:', error);
  }
}
