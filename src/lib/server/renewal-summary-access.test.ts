import { describe, expect, it, vi } from 'vitest';

// isCompleteEnrollment is pure; mock prisma so importing the module is I/O-free.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { isCompleteEnrollment } = await import('./renewal-summary');

/**
 * WS3 (P0-C, AC-8) review fix — a revoked/refunded course credits NO CEC toward
 * IICRC renewal, even though its lesson-progress rows survive revocation.
 */
describe('isCompleteEnrollment — CEC crediting excludes revoked', () => {
  it('does NOT count a revoked course even with all lessons complete', () => {
    expect(isCompleteEnrollment({ status: 'revoked', allLessonsComplete: true })).toBe(false);
  });

  it('does NOT count a refunded course even with all lessons complete', () => {
    expect(isCompleteEnrollment({ status: 'refunded', allLessonsComplete: true })).toBe(false);
  });

  it('counts a genuinely completed course', () => {
    expect(isCompleteEnrollment({ status: 'completed', allLessonsComplete: false })).toBe(true);
  });

  it('counts an active course whose lessons are all complete', () => {
    expect(isCompleteEnrollment({ status: 'active', allLessonsComplete: true })).toBe(true);
  });
});
