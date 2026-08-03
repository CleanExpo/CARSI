import { describe, expect, it } from 'vitest';

import {
  isMissingTableError,
  isUniqueConstraintError,
  isUniqueConstraintErrorForFields,
} from './db-errors';

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

describe('isUniqueConstraintErrorForFields', () => {
  const sameEmailError = {
    code: 'P2002',
    meta: {
      modelName: 'CcwRoadshowSignIn',
      driverAdapterError: {
        cause: {
          originalCode: '23505',
          kind: 'UniqueConstraintViolation',
          constraint: { fields: ['event_slug', 'normalized_email'] },
        },
      },
    },
  };

  it('matches the exact Prisma 7 adapter constraint fields regardless of order', () => {
    expect(
      isUniqueConstraintErrorForFields(sameEmailError, ['normalized_email', 'event_slug']),
    ).toBe(true);
  });

  it('does not mask a P2002 from another constraint or an unscoped P2002', () => {
    expect(isUniqueConstraintErrorForFields(sameEmailError, ['enrollment_id'])).toBe(false);
    expect(isUniqueConstraintErrorForFields({ code: 'P2002' }, ['event_slug', 'normalized_email'])).toBe(
      false,
    );
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
