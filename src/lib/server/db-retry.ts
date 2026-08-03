/**
 * Detects a Postgres serialization failure / deadlock / write-conflict, which is
 * the expected, retryable outcome when two Serializable transactions race on the
 * same rows. Pure (no imports) so it stays trivially testable.
 */
export function isSerializationConflict(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  ) {
    return true;
  }
  if (error && typeof error === 'object' && 'cause' in error) {
    const cause = (error as { cause?: unknown }).cause;
    if (
      cause &&
      typeof cause === 'object' &&
      'originalCode' in cause &&
      (cause as { originalCode?: unknown }).originalCode === '40001'
    ) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return /could not serialize|serialization failure|deadlock detected|write conflict|40001|40P01/i.test(
    message,
  );
}
