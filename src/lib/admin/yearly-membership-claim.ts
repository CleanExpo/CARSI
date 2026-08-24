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
 * The claim is keyed by EMAIL in its own table, deliberately not by a column on
 * `LmsUser`. The grant CREATES that row — near the start, before the enrolment
 * loop and the mail send — so a claim living there could not be taken until the
 * grant was already underway, leaving the ordinary new-learner path unguarded
 * across the slowest stretch of the work. That is precisely when an operator
 * retries. A claim keyed by email is takeable BEFORE the grant starts, whether
 * or not the learner has an account.
 *
 * A WINDOW rather than a permanent lock, unlike the CCW comp. That path issues a
 * one-off comp for a named attendee, so set-if-null is right there. A yearly
 * membership is renewed by design: refusing forever would block a legitimate
 * renewal and leave no way to issue one.
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

/** Normalised the same way everywhere, so casing cannot slip past the guard. */
export function normaliseClaimEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * PURE, so the window arithmetic is testable without a database.
 *
 * A claim stamped before this instant no longer blocks; one stamped at or after
 * it does.
 */
export function yearlyMembershipClaimCutoff(
  now: Date,
  windowMs: number = YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
): Date {
  return new Date(now.getTime() - windowMs);
}

/**
 * Claim the right to grant, atomically, BEFORE the grant runs.
 *
 * The conditional upsert is the whole guard: PostgreSQL inserts when no claim
 * exists and updates only when the existing one has aged out, so two requests
 * arriving together cannot both win. A read-then-write could not decide this —
 * the same reason the CCW path stopped inferring its duplicate check from
 * enrolment payment references.
 *
 * `$executeRaw` returns the affected row count: 1 means the claim is ours, 0
 * means a grant for this email landed inside the window.
 *
 * The interpolations are Prisma template parameters, not string concatenation,
 * so the email is bound rather than inlined.
 */
export async function claimYearlyMembershipGrant(
  email: string,
  now: Date = new Date(),
  windowMs: number = YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
): Promise<boolean> {
  const key = normaliseClaimEmail(email);
  const cutoff = yearlyMembershipClaimCutoff(now, windowMs);

  const affected = await prisma.$executeRaw`
    INSERT INTO yearly_membership_grant_claims (email, claimed_at)
    VALUES (${key}, ${now})
    ON CONFLICT (email) DO UPDATE SET claimed_at = ${now}
    WHERE yearly_membership_grant_claims.claimed_at < ${cutoff}
  `;

  return affected === 1;
}

/**
 * Give the claim back when the grant did not happen.
 *
 * Scoped to the exact timestamp this call wrote, so a claim another request has
 * since taken is never cleared. Without this, one failed attempt would block the
 * learner for the whole window for nothing.
 *
 * Never throws: it runs on a path already handling a failure, and losing the
 * release costs a wait, not access.
 */
export async function releaseYearlyMembershipClaim(email: string, claimedAt: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM yearly_membership_grant_claims
      WHERE email = ${normaliseClaimEmail(email)} AND claimed_at = ${claimedAt}
    `;
  } catch (error) {
    // No learner identifier in the log line (CWE-532 was paid for once on this
    // code path already).
    console.error('[yearly-membership] claim release failed:', error);
  }
}
