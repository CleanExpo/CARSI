/**
 * Logged-out "Start membership" flow. A buyer with no session used to be sent to `/login`,
 * a dead end for anyone without an account. They now go to `/register` with `next` pointing
 * back at `/subscribe`; the register form sees that target and starts the membership checkout
 * as the newly created user, so the Stripe session (and the entitlement it grants) carries
 * that user's id. Signing in instead keeps the same `next`, returning the buyer to `/subscribe`.
 */

export const MEMBERSHIP_PATH = '/subscribe';

/** Where a logged-out visitor goes when they click "Start membership". */
export function membershipSignupPath(): string {
  return `/register?next=${encodeURIComponent(MEMBERSHIP_PATH)}`;
}

/** Sign-in link for the register page, preserving a safe same-origin `next`. */
export function loginPathWithNext(next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}

/** Sign-up link for the login page, preserving a safe same-origin `next`. */
export function registerPathWithNext(next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `/register?next=${encodeURIComponent(safe)}` : '/register';
}

/** A same-origin path, or null. Rejects absolute and protocol-relative URLs. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return null;
  }
  return next;
}

/** True when a post-registration `next` asks to resume the membership checkout. */
export function isMembershipCheckoutResume(next: string | null | undefined): boolean {
  const safe = safeNextPath(next);
  if (!safe) return false;
  const path = safe.split(/[?#]/, 1)[0];
  return path === MEMBERSHIP_PATH;
}
