import { describe, expect, it } from 'vitest';

import {
  attendanceComplete,
  baseOfferEligible,
  courseAccessGranted,
  type CcwSignInEligibilityInput,
} from './eligibility';

/** Pure server-side derivations; no client-presented attendance flag. This
 * course grants NO CECs, so there is no CEC predicate — both days yields a plain
 * certificate of attendance, surfaced here as `attendanceComplete`. */
function base(overrides: Partial<CcwSignInEligibilityInput> = {}): CcwSignInEligibilityInput {
  return {
    day1CheckedInAt: null,
    day2CheckedInAt: null,
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

describe('attendanceComplete (certificate-of-attendance trigger)', () => {
  it('true only when BOTH days are checked in', () => {
    expect(attendanceComplete(base({ day1CheckedInAt: now, day2CheckedInAt: now }))).toBe(true);
  });

  it('false with only one day (or neither)', () => {
    expect(attendanceComplete(base())).toBe(false);
    expect(attendanceComplete(base({ day1CheckedInAt: now }))).toBe(false);
    expect(attendanceComplete(base({ day2CheckedInAt: now }))).toBe(false);
  });

  it('does NOT depend on provisioning/enrolment — it is purely both-days', () => {
    // Both days but not yet provisioned still reads complete; the certificate
    // WRITE (in the async batch) is what additionally requires an enrolment.
    expect(
      attendanceComplete(base({ day1CheckedInAt: now, day2CheckedInAt: now, enrollmentId: null })),
    ).toBe(true);
  });
});

describe('baseOfferEligible (deferred unit — predicate only, no UI wired)', () => {
  it('true when provisioned AND has >=1 check-in', () => {
    expect(baseOfferEligible(base({ enrollmentId: 'e1', day1CheckedInAt: now }))).toBe(true);
    expect(baseOfferEligible(base({ enrollmentId: 'e1' }))).toBe(false);
    expect(baseOfferEligible(base({ day1CheckedInAt: now }))).toBe(false);
  });
});
