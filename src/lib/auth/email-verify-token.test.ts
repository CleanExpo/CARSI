import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { getSessionSecretBytes } from './jwt-secret';
import {
  signEmailUnsubscribeToken,
  signEmailVerificationToken,
  signPasswordResetToken,
  signProofPackShareToken,
  signSessionToken,
  verifyEmailUnsubscribeToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
  verifyProofPackShareToken,
  verifySessionToken,
} from './session-jwt';

const SESSION = {
  sub: 'user-123',
  email: 'student@example.test',
  full_name: 'Sam Student',
  role: 'student',
};

/** A token signed with the real key, with exactly the claims given. */
async function forge(claims: Record<string, unknown>, audience?: string): Promise<string> {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h');
  if (audience) jwt.setAudience(audience);
  return jwt.sign(getSessionSecretBytes());
}

describe('email verification token (GP-699)', () => {
  it('round-trips the user id and the address it was issued for', async () => {
    const token = await signEmailVerificationToken('user-123', 'Student@Example.test');
    expect(await verifyEmailVerificationToken(token)).toEqual({
      userId: 'user-123',
      email: 'student@example.test',
    });
  });

  it('expires 7 days after it is issued', async () => {
    const token = await signEmailVerificationToken('user-123', 'student@example.test');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  it('carries the address in addr and never in the session claim email', async () => {
    const token = await signEmailVerificationToken('user-123', 'student@example.test');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.addr).toBe('student@example.test');
    expect(payload).not.toHaveProperty('email');
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

  it('rejects every other token this key signs', async () => {
    expect(await verifyEmailVerificationToken(await signSessionToken(SESSION))).toBeNull();
    expect(await verifyEmailVerificationToken(await signPasswordResetToken('user-123'))).toBeNull();
    expect(
      await verifyEmailVerificationToken(await signProofPackShareToken('user-123'))
    ).toBeNull();
    expect(
      await verifyEmailVerificationToken(await signEmailUnsubscribeToken('user-123'))
    ).toBeNull();
  });

  // Each check must hold alone. These tokens carry the address, so only the one
  // named check stands between them and acceptance.
  it('rejects the right claims under the wrong audience', async () => {
    const claims = { purpose: 'email_verification', addr: 'student@example.test' };
    expect(await verifyEmailVerificationToken(await forge(claims))).toBeNull();
    expect(
      await verifyEmailVerificationToken(await forge(claims, 'carsi-email-unsubscribe'))
    ).toBeNull();
  });

  it('rejects the right audience under the wrong purpose', async () => {
    expect(
      await verifyEmailVerificationToken(
        await forge(
          { purpose: 'password_reset', addr: 'student@example.test' },
          'carsi-email-verification'
        )
      )
    ).toBeNull();
    expect(
      await verifyEmailVerificationToken(
        await forge({ addr: 'student@example.test' }, 'carsi-email-verification')
      )
    ).toBeNull();
  });

  it('is not accepted by any other verifier', async () => {
    const token = await signEmailVerificationToken('user-123', 'student@example.test');
    expect(await verifySessionToken(token)).toBeNull();
    expect(await verifyPasswordResetToken(token)).toBeNull();
    expect(await verifyProofPackShareToken(token)).toBeNull();
    expect(await verifyEmailUnsubscribeToken(token)).toBeNull();
  });
});

describe('session token isolation (GP-699)', () => {
  it('still accepts a real session token', async () => {
    expect(await verifySessionToken(await signSessionToken(SESSION))).toEqual(SESSION);
  });

  it('never accepts a link token as a login session', async () => {
    expect(await verifySessionToken(await signPasswordResetToken('user-123'))).toBeNull();
    expect(await verifySessionToken(await signProofPackShareToken('user-123'))).toBeNull();
    expect(await verifySessionToken(await signEmailUnsubscribeToken('user-123'))).toBeNull();
    expect(
      await verifySessionToken(await signEmailVerificationToken('user-123', 'student@example.test'))
    ).toBeNull();
  });

  // Session-shaped claims (sub + email) must not be enough once a token is
  // marked as a link token. Each marker must be refused alone.
  it('refuses session-shaped claims that carry a purpose', async () => {
    expect(
      await verifySessionToken(
        await forge({ email: 'student@example.test', purpose: 'email_verification' })
      )
    ).toBeNull();
  });

  it('refuses session-shaped claims that carry an audience', async () => {
    expect(
      await verifySessionToken(
        await forge({ email: 'student@example.test' }, 'carsi-email-verification')
      )
    ).toBeNull();
  });

  it('accepts the same session-shaped claims with neither marker', async () => {
    expect(await verifySessionToken(await forge({ email: 'student@example.test' }))).toMatchObject({
      sub: 'user-123',
      email: 'student@example.test',
    });
  });
});
