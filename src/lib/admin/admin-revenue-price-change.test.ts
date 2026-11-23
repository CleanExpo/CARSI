import { describe, expect, it } from 'vitest';

import { summariseOpsPeriod } from './admin-ops-metrics';

// GP-763: the July price import (22/11/2026) gives 18 free courses a price. Admin revenue
// must never be derived from a course's price today, so past free enrolments stay at $0.

const now = new Date('2026-11-22T02:00:00.000Z');

function row(paymentReference: string | null, status = 'active') {
  return {
    enrolledAt: new Date('2026-11-05T00:00:00.000Z'),
    completedAt: null,
    certificateIssuedAt: null,
    status,
    paymentReference,
    // The course as it reads AFTER the import: no longer free, priced at $49.
    course: { isFree: false, priceAud: 49 },
  };
}

describe('admin revenue after a course price change (GP-763)', () => {
  it('a free enrolment on a course whose price later changes counts $0', () => {
    const k = summariseOpsPeriod([row('free')], [], 'this_month', now);
    expect(k.revenueAud).toBe(0);
    expect(k.paidEnrollments).toBe(0);
    expect(k.enrollments).toBe(1);
  });

  it('admin, team, membership, org, discount and attendance grants are not paid', () => {
    const refs = [
      'admin:full-access',
      'admin:seed-catalog',
      'admin:yearly-membership:free',
      'team:abc',
      'team-seat:abc',
      'membership:u1',
      'org:abc',
      'discount:d1',
      'ccw:attendance',
    ];
    const k = summariseOpsPeriod(refs.map((r) => row(r)), [], 'all', now);
    expect(k.revenueAud).toBe(0);
    expect(k.paidEnrollments).toBe(0);
  });

  it('a Stripe-paid enrolment is counted but never valued at the current list price', () => {
    const k = summariseOpsPeriod([row('cs_live_123'), row('free')], [], 'this_month', now);
    expect(k.paidEnrollments).toBe(1);
    expect(k.revenueAud).not.toBe(49);
    expect(k.revenueAud).toBeNull();
  });

  it('a refunded or revoked Stripe enrolment is not paid', () => {
    const k = summariseOpsPeriod(
      [row('cs_live_1', 'refunded'), row('cs_live_2', 'revoked')],
      [],
      'all',
      now
    );
    expect(k.paidEnrollments).toBe(0);
    expect(k.revenueAud).toBe(0);
  });
});
