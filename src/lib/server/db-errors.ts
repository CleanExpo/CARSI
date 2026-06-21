/**
 * Detects a Prisma P2002 unique-constraint violation. Pure (no imports) so it
 * stays trivially testable and importable from Edge or Node code.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Detects a Prisma P2021 "table does not exist" error — i.e. a pending
 * migration hasn't been applied yet. Lets callers degrade gracefully instead
 * of 500ing until `prisma migrate deploy` runs.
 */
export function isMissingTableError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2021'
  );
}
