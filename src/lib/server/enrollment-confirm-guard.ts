/**
 * WS5 — payer-email ownership for POST /api/lms/enrollments/confirm.
 *
 * FAIL CLOSED: a paid Stripe session may only be finalised against the account
 * whose email matches the session's payer email. Both emails must be PRESENT and
 * EQUAL — an absent email on either side is never a pass (the previous code
 * skipped the check whenever either was falsy, letting a JWT with no email claim
 * finalise a session paid for under someone else's email).
 */
export function normaliseEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function confirmEmailOwnershipOk(
  sessionEmail: string | null | undefined,
  accountEmail: string | null | undefined,
): boolean {
  const session = normaliseEmail(sessionEmail);
  const account = normaliseEmail(accountEmail);
  return session.length > 0 && account.length > 0 && session === account;
}
