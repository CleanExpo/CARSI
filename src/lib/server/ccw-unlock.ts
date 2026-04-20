import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Password required to unlock CCW participant training resources.
 * Sourced from `CCW_TRAINING_PASSWORD` env var; see `.env.example`.
 * Falls back to an empty string so verification fails closed if unset.
 */
const EXPECTED_PASSWORD = process.env.CCW_TRAINING_PASSWORD ?? '';

export function verifyCcwPassword(attempt: string): boolean {
  if (!EXPECTED_PASSWORD) return false;
  const a = createHash('sha256').update(attempt, 'utf8').digest();
  const b = createHash('sha256').update(EXPECTED_PASSWORD, 'utf8').digest();
  return a.length === b.length && timingSafeEqual(a, b);
}
