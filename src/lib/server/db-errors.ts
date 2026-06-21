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
