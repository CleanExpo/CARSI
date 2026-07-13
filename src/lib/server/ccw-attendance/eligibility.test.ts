import { describe, expect, it } from 'vitest';

import {
  baseOfferEligible,
  cecEligible,
  courseAccessGranted,
  type CcwSignInEligibilityInput,
} from './eligibility';

/** AC#15(j) — pure server-side derivations; no client-presented attendance flag. */
function base(overrides: Partial<CcwSignInEligibilityInput> = {}): CcwSignInEligibilityInput {
  return {
    day1CheckedInAt: null,
    day2CheckedInAt: null,
    iicrcRegNumber: null,
    studentId: null,
    enrollmentId: null,
    provisionStatus: 'pending',
    ...overrides,
  };
}

const now = new Date();

describe('courseAccessGranted', () => {
  it('is granted once provisioned/enrolled (at Day-1, not gated on both days)', () => {
    expect(courseAccessGranted(base({ day1CheckedInAt: now }))).toBe(false);
    expect(courseAccessGranted(base({ day1CheckedInAt: now, enrollmentId: 'e1' }))).toBe(true);
    expect(courseAccessGranted(base({ provisionStatus: 'provisioned' }))).toBe(true);
  });
});

describe('cecEligible', () => {
  it('requires both days AND an IICRC# AND cecHours>0', () => {
    const bothDaysIicrc = base({ day1CheckedInAt: now, day2CheckedInAt: now, iicrcRegNumber: 'IICRC-1' });
    expect(cecEligible(bothDaysIicrc, 4)).toBe(true);
  });

  it('no IICRC# → NOT CEC-eligible (cert of attendance only)', () => {
    const bothDaysNoIicrc = base({ day1CheckedInAt: now, day2CheckedInAt: now, iicrcRegNumber: null });
    expect(cecEligible(bothDaysNoIicrc, 4)).toBe(false);
  });

  it('cecHours 0/null (not CEC-approved) → NOT eligible even with IICRC# + both days', () => {
    const bothDaysIicrc = base({ day1CheckedInAt: now, day2CheckedInAt: now, iicrcRegNumber: 'IICRC-1' });
    expect(cecEligible(bothDaysIicrc, 0)).toBe(false);
    expect(cecEligible(bothDaysIicrc, null)).toBe(false);
  });

  it('only one day → NOT eligible', () => {
    expect(cecEligible(base({ day1CheckedInAt: now, iicrcRegNumber: 'IICRC-1' }), 4)).toBe(false);
  });

  it('blank/whitespace IICRC# is treated as absent', () => {
    expect(cecEligible(base({ day1CheckedInAt: now, day2CheckedInAt: now, iicrcRegNumber: '  ' }), 4)).toBe(false);
  });
});

describe('baseOfferEligible (deferred unit — predicate only, no UI wired)', () => {
  it('true when provisioned AND has >=1 check-in', () => {
    expect(baseOfferEligible(base({ enrollmentId: 'e1', day1CheckedInAt: now }))).toBe(true);
    expect(baseOfferEligible(base({ enrollmentId: 'e1' }))).toBe(false);
    expect(baseOfferEligible(base({ day1CheckedInAt: now }))).toBe(false);
  });
});
