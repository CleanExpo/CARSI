/**
 * Server-side password policy for account creation and reset.
 * Returns an error message string, or null when the password is acceptable.
 */

export const MIN_PASSWORD_LENGTH = 8;

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.trim().length === 0) {
    return 'Password cannot be only spaces.';
  }
  return null;
}
