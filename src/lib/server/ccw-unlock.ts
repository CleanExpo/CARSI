import { createHash, timingSafeEqual } from 'node:crypto';

const EXPECTED_PASSWORD = 'CCW-TRAINING';

export function verifyCcwPassword(attempt: string): boolean {
  const a = createHash('sha256').update(attempt, 'utf8').digest();
  const b = createHash('sha256').update(EXPECTED_PASSWORD, 'utf8').digest();
  return a.length === b.length && timingSafeEqual(a, b);
}
