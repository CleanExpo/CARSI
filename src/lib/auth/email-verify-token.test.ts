import { describe, expect, it } from 'vitest';

import {
  signEmailUnsubscribeToken,
  signEmailVerificationToken,
  signPasswordResetToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
} from './session-jwt';

describe('email verification token (GP-699)', () => {
  it('round-trips the user id and the address it was issued for', async () => {
    const token = await signEmailVerificationToken('user-123', 'Student@Example.test');
    expect(await verifyEmailVerificationToken(token)).toEqual({
      userId: 'user-123',
      email: 'student@example.test',
    });
  });

  it('rejects a malformed token', async () => {
    expect(await verifyEmailVerificationToken('not-a-jwt')).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const token = await signEmailVerificationToken('user-123', 'student@example.test');
    const [h, p, s] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), sub: 'user-999' })
    ).toString('base64url');
    expect(await verifyEmailVerificationToken(`${h}.${forged}.${s}`)).toBeNull();
  });

  it('rejects tokens minted for another purpose', async () => {
    expect(await verifyEmailVerificationToken(await signPasswordResetToken('user-123'))).toBeNull();
    expect(
      await verifyEmailVerificationToken(await signEmailUnsubscribeToken('user-123'))
    ).toBeNull();
  });

  it('cannot be used as a password-reset token', async () => {
    const token = await signEmailVerificationToken('user-123', 'student@example.test');
    expect(await verifyPasswordResetToken(token)).toBeNull();
  });
});
