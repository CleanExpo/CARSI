const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same-origin path only. Query strings are allowed; protocol-relative and off-site URLs are not. */
export function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export function isUsableRecoveryEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return EMAIL_RE.test(value) && value.length <= 254;
}

/**
 * Recovery page for a guest who already paid and never set a password.
 * Prefills email, marks the visit as a paid lockout, and carries the course next=.
 */
export function buildGuestPasswordSetupPath(input: {
  email?: string;
  next?: string;
}): string {
  const params = new URLSearchParams();
  params.set('paid', '1');
  const email = input.email?.trim().toLowerCase() ?? '';
  if (isUsableRecoveryEmail(email)) params.set('email', email);
  if (input.next && isSafeInternalPath(input.next)) params.set('next', input.next);
  return `/forgot-password?${params.toString()}`;
}
