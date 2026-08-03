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

  it('detects the Prisma 7 adapter nested Postgres serialization code', () => {
    expect(
      isSerializationConflict({
        name: 'DriverAdapterError',
        message: 'TransactionWriteConflict',
        cause: { originalCode: '40001', kind: 'TransactionWriteConflict' },
      }),
    ).toBe(true);
  });

  it('does not classify unrelated nested adapter failures as serialization conflicts', () => {
    expect(
      isSerializationConflict({
        name: 'DriverAdapterError',
        cause: { originalCode: '23505', kind: 'UniqueConstraintViolation' },
      }),
    ).toBe(false);
    expect(isSerializationConflict({ meta: { originalCode: '40001' } })).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(isSerializationConflict(new Error('null value violates not-null constraint'))).toBe(false);
    expect(isSerializationConflict(undefined)).toBe(false);
    expect(isSerializationConflict('NOT_ENOUGH_CAPACITY')).toBe(false);
  });
});
