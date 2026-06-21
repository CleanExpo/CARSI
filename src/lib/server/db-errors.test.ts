import { describe, expect, it } from 'vitest';

import { isUniqueConstraintError } from './db-errors';

describe('isUniqueConstraintError', () => {
  it('detects the Prisma P2002 unique-constraint code', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
  });

  it('returns false for other Prisma codes and unrelated errors', () => {
    expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false);
    expect(isUniqueConstraintError(new Error('boom'))).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
