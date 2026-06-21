import { describe, expect, it } from 'vitest';

import { isMissingTableError, isUniqueConstraintError } from './db-errors';

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

describe('isMissingTableError', () => {
  it('detects the Prisma P2021 "table does not exist" code', () => {
    expect(isMissingTableError({ code: 'P2021' })).toBe(true);
  });

  it('returns false for other codes and unrelated errors', () => {
    expect(isMissingTableError({ code: 'P2002' })).toBe(false);
    expect(isMissingTableError(new Error('boom'))).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
