import { describe, expect, it } from 'vitest';

import {
  classifyLoginFailure,
  isProvisionalPasswordHash,
  NEEDS_PASSWORD_SETUP_MESSAGE,
  provisionalPasswordHash,
  verifyPassword,
} from '@/lib/server/lms-auth';

describe('classifyLoginFailure — provisional-password recovery', () => {
  it('does not call a provisional account "Invalid credentials"', () => {
    const kind = classifyLoginFailure({
      isActive: true,
      hashedPassword: provisionalPasswordHash(),
    });
    expect(kind).toBe('needs_password_setup');
    expect(NEEDS_PASSWORD_SETUP_MESSAGE.toLowerCase()).not.toContain('invalid credentials');
    expect(NEEDS_PASSWORD_SETUP_MESSAGE.toLowerCase()).toContain('set one');
  });

  it('treats a jwt: placeholder the same way — never a typed password', () => {
    expect(
      classifyLoginFailure({ isActive: true, hashedPassword: 'jwt:sync-placeholder' }),
    ).toBe('needs_password_setup');
  });

  it('keeps a wrong password on an established account as generic invalid', () => {
    expect(
      classifyLoginFailure({ isActive: true, hashedPassword: '$2a$12$realhash' }),
    ).toBe('invalid');
  });

  it('does not reveal an inactive or missing account as needing a password', () => {
    expect(classifyLoginFailure(null)).toBe('invalid');
    expect(
      classifyLoginFailure({ isActive: false, hashedPassword: provisionalPasswordHash() }),
    ).toBe('invalid');
  });
});

describe('verifyPassword — a provisional marker can never authenticate', () => {
  it('rejects any typed secret against a provisional: hash', async () => {
    const stored = provisionalPasswordHash();
    expect(isProvisionalPasswordHash(stored)).toBe(true);
    await expect(verifyPassword('anything-they-type', stored)).resolves.toBe(false);
    await expect(verifyPassword(stored, stored)).resolves.toBe(false);
  });
});
