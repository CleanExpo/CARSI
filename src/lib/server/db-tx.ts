import { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { isSerializationConflict } from '@/lib/server/db-retry';

const MAX_TX_ATTEMPTS = 3;

/**
 * Retry an async operation when it fails with a Postgres serialization conflict
 * — the expected, retryable outcome when two SERIALIZABLE transactions race on
 * the same rows. The runner is injected so the retry policy stays unit-testable
 * without a database.
 */
export async function withSerializationRetry<T>(
  run: () => Promise<T>,
  maxAttempts: number = MAX_TX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (isSerializationConflict(error) && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Run `fn` inside a SERIALIZABLE transaction, retrying a bounded number of times
 * on a serialization conflict. This is what prevents two concurrent writers from
 * both reading the same count and both committing past a cap (e.g. roadshow seats
 * or quiz attempt limits).
 */
export function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withSerializationRetry(() =>
    prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }),
  );
}
