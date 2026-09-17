import { describe, expect, it } from 'vitest';

import { periodBounds, summariseOpsPeriod } from './admin-ops-metrics';

const now = new Date('2026-09-17T02:00:00.000Z');

function sale(partial: {
  enrolledAt: string;
  completedAt?: string | null;
  certificateIssuedAt?: string | null;
  status?: string;
  paymentReference?: string | null;
  priceAud?: number;
  isFree?: boolean;
}) {
  return {
    enrolledAt: new Date(partial.enrolledAt),
    completedAt: partial.completedAt ? new Date(partial.completedAt) : null,
    certificateIssuedAt: partial.certificateIssuedAt ? new Date(partial.certificateIssuedAt) : null,
    status: partial.status ?? 'active',
    paymentReference: partial.paymentReference === undefined ? 'cs_test' : partial.paymentReference,
    course: { isFree: partial.isFree ?? false, priceAud: partial.priceAud ?? 49 },
  };
}

describe('summariseOpsPeriod', () => {
  it('counts catalogue AUD only for paid, non-revoked rows in the month', () => {
    const sales = [
      sale({ enrolledAt: '2026-09-02T00:00:00.000Z', priceAud: 49 }),
      sale({ enrolledAt: '2026-08-02T00:00:00.000Z', priceAud: 99 }),
      sale({ enrolledAt: '2026-09-03T00:00:00.000Z', status: 'refunded', priceAud: 49 }),
      sale({ enrolledAt: '2026-09-04T00:00:00.000Z', paymentReference: null, priceAud: 49 }),
    ];
    const month = summariseOpsPeriod(sales, [new Date('2026-09-01T00:00:00.000Z')], 'this_month', now);
    expect(month.revenueAud).toBe(49);
    expect(month.paidEnrollments).toBe(1);
    expect(month.enrollments).toBe(3);
    expect(month.newUsers).toBe(1);
  });

  it('last month excludes the current month', () => {
    const sales = [sale({ enrolledAt: '2026-08-20T00:00:00.000Z', priceAud: 20 })];
    expect(summariseOpsPeriod(sales, [], 'last_month', now).revenueAud).toBe(20);
    expect(summariseOpsPeriod(sales, [], 'this_month', now).revenueAud).toBe(0);
  });
});

describe('periodBounds', () => {
  it('this_year starts 1 January', () => {
    const { from } = periodBounds('this_year', now);
    expect(from?.getFullYear()).toBe(2026);
    expect(from?.getMonth()).toBe(0);
    expect(from?.getDate()).toBe(1);
  });
});
