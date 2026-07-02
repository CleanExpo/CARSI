import { describe, expect, it } from 'vitest';

import {
  signEmailUnsubscribeToken,
  signPasswordResetToken,
  verifyEmailUnsubscribeToken,
} from './session-jwt';

describe('email unsubscribe token', () => {
  it('round-trips the user id', async () => {
    const token = await signEmailUnsubscribeToken('user-123');
    expect(await verifyEmailUnsubscribeToken(token)).toBe('user-123');
  });

  it('rejects a malformed token', async () => {
    expect(await verifyEmailUnsubscribeToken('not-a-jwt')).toBeNull();
  });

  it('rejects a token minted for a different purpose (audience isolation)', async () => {
    // A password-reset token must NOT be accepted as an unsubscribe token, even
    // though both are signed with the same secret.
    const reset = await signPasswordResetToken('user-123');
    expect(await verifyEmailUnsubscribeToken(reset)).toBeNull();
  });
});
