import { describe, expect, it } from 'vitest';

import {
  periodBounds,
  summariseOpsMonthly,
  summariseOpsPeriod,
  topCoursesByPaidEnrollments,
} from './admin-ops-metrics';

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
  it('counts only Stripe-paid, non-revoked rows in the month, never at list price', () => {
    const sales = [
      sale({ enrolledAt: '2026-09-02T00:00:00.000Z', priceAud: 49 }),
      sale({ enrolledAt: '2026-08-02T00:00:00.000Z', priceAud: 99 }),
      sale({ enrolledAt: '2026-09-03T00:00:00.000Z', status: 'refunded', priceAud: 49 }),
      sale({ enrolledAt: '2026-09-04T00:00:00.000Z', paymentReference: null, priceAud: 49 }),
    ];
    const month = summariseOpsPeriod(sales, [new Date('2026-09-01T00:00:00.000Z')], 'this_month', now);
    expect(month.revenueAud).toBeNull();
    expect(month.paidEnrollments).toBe(1);
    expect(month.enrollments).toBe(3);
    expect(month.newUsers).toBe(1);
  });

  it('last month excludes the current month', () => {
    const sales = [sale({ enrolledAt: '2026-08-20T00:00:00.000Z', priceAud: 20 })];
    expect(summariseOpsPeriod(sales, [], 'last_month', now).paidEnrollments).toBe(1);
    expect(summariseOpsPeriod(sales, [], 'this_month', now).paidEnrollments).toBe(0);
    expect(summariseOpsPeriod(sales, [], 'this_month', now).revenueAud).toBe(0);
  });
});

describe('summariseOpsMonthly (GP-763)', () => {
  it('counts Stripe-paid enrolments per month and ignores free ones on now-priced courses', () => {
    const months = summariseOpsMonthly(
      [
        sale({ enrolledAt: '2026-09-02T00:00:00.000Z' }),
        sale({ enrolledAt: '2026-09-03T00:00:00.000Z', paymentReference: 'free', priceAud: 99 }),
        sale({ enrolledAt: '2026-08-03T00:00:00.000Z', paymentReference: 'admin:full-access' }),
      ],
      now
    );
    expect(months).toHaveLength(8);
    const sep = months.find((m) => m.month === '2026-09');
    const aug = months.find((m) => m.month === '2026-08');
    expect(sep).toMatchObject({ paidEnrollments: 1, enrollments: 2 });
    expect(aug).toMatchObject({ paidEnrollments: 0, enrollments: 1 });
    expect(months.some((m) => 'revenueAud' in m)).toBe(false);
  });
});

describe('topCoursesByPaidEnrollments (GP-763)', () => {
  it('ranks by Stripe-paid enrolments, not by price, and skips free and team seats', () => {
    const row = (courseId: string, title: string, paymentReference: string, priceAud: number) => ({
      ...sale({ enrolledAt: '2026-09-02T00:00:00.000Z', paymentReference, priceAud }),
      courseId,
      course: { title, isFree: false, priceAud },
    });
    const top = topCoursesByPaidEnrollments([
      row('a', 'Cheap', 'cs_1', 29),
      row('a', 'Cheap', 'cs_2', 29),
      row('b', 'Dear', 'cs_3', 99),
      row('b', 'Dear', 'free', 99),
      row('b', 'Dear', 'team:t1', 99),
    ]);
    expect(top).toEqual([
      { title: 'Cheap', paidEnrollments: 2 },
      { title: 'Dear', paidEnrollments: 1 },
    ]);
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
