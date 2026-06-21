import { describe, expect, it } from 'vitest';

import { isSerializationConflict } from './db-retry';

describe('isSerializationConflict', () => {
  it('detects the Prisma P2034 write-conflict/deadlock code', () => {
    expect(isSerializationConflict({ code: 'P2034' })).toBe(true);
  });

  it('detects Postgres serialization-failure / deadlock messages', () => {
    expect(
      isSerializationConflict(
        new Error('could not serialize access due to read/write dependencies among transactions'),
      ),
    ).toBe(true);
    expect(isSerializationConflict(new Error('deadlock detected'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isSerializationConflict(new Error('null value violates not-null constraint'))).toBe(false);
    expect(isSerializationConflict(undefined)).toBe(false);
    expect(isSerializationConflict('NOT_ENOUGH_CAPACITY')).toBe(false);
  });
});
