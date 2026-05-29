import { randomBytes } from 'node:crypto';

/** Human-friendly temporary password for provisioned team members (email delivery). */
export function generateMemberTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return `Carsi-${out}`;
}
