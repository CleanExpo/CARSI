import { describe, expect, it } from 'vitest';

import { validateNewPassword } from './password-policy';

describe('validateNewPassword', () => {
  it('accepts a password of at least 8 characters', () => {
    expect(validateNewPassword('abcdefgh')).toBeNull();
    expect(validateNewPassword('a-strong-password')).toBeNull();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validateNewPassword('short')).toMatch(/8 characters/);
    expect(validateNewPassword('')).toMatch(/8 characters/);
  });

  it('rejects an all-whitespace password even at length 8', () => {
    expect(validateNewPassword('        ')).toMatch(/spaces/);
  });
});
