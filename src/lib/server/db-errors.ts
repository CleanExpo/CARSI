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
 * Narrows P2002 handling to one exact constraint. Prisma 7's PostgreSQL adapter
 * reports physical column names under `meta.driverAdapterError.cause`; older
 * client shapes may expose the same list as `meta.target`.
 */
export function isUniqueConstraintErrorForFields(
  error: unknown,
  expectedFields: readonly string[],
): boolean {
  if (!isUniqueConstraintError(error)) return false;

  const meta = (error as { meta?: unknown }).meta;
  if (!meta || typeof meta !== 'object') return false;

  const directTarget = (meta as { target?: unknown }).target;
  const adapterCause = (meta as { driverAdapterError?: { cause?: unknown } }).driverAdapterError
    ?.cause;
  const adapterConstraint =
    adapterCause && typeof adapterCause === 'object'
      ? (adapterCause as { constraint?: unknown }).constraint
      : undefined;
  const adapterFields =
    adapterConstraint && typeof adapterConstraint === 'object'
      ? (adapterConstraint as { fields?: unknown }).fields
      : undefined;
  const fields = Array.isArray(directTarget)
    ? directTarget
    : Array.isArray(adapterFields)
      ? adapterFields
      : null;

  if (!fields || !fields.every((field): field is string => typeof field === 'string')) {
    return false;
  }

  const actual = [...fields].sort();
  const expected = [...expectedFields].sort();
  return actual.length === expected.length && actual.every((field, index) => field === expected[index]);
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
