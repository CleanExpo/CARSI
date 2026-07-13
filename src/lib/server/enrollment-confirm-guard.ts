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

/**
 * Resolve the ACCOUNT email to compare against the Stripe payer email: prefer the
 * JWT claim, else look it up by id. The Stripe session email is NEVER a source
 * here — it is the value being checked against, not a fallback. DB lookup is
 * injected so this is unit-testable.
 */
export async function resolveAccountEmail(
  claimEmail: string | null | undefined,
  lookupEmailById: () => Promise<string | null | undefined>,
): Promise<string | null> {
  const claim = (claimEmail ?? '').trim();
  if (claim) return claim;
  const dbEmail = (await lookupEmailById()) ?? null;
  const trimmed = dbEmail?.trim();
  return trimmed ? trimmed : null;
}
