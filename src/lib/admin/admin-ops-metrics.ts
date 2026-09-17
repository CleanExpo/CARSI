import { type AdminOpsPeriod } from '@/lib/admin/admin-ops-format';

export { formatAud } from '@/lib/admin/admin-ops-format';
export type { AdminOpsPeriod };

function listPriceAudFromCourse(course: { isFree: boolean; priceAud: unknown }): number {
  if (course.isFree) return 0;
  const n = Number(course.priceAud);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function enrollmentLooksPaid(e: { status: string; paymentReference: string | null }): boolean {
  const status = (e.status ?? '').toLowerCase();
  if (status === 'refunded' || status === 'revoked') return false;
  return Boolean(e.paymentReference?.trim());
}

export type AdminOpsPeriodKpis = {
  revenueAud: number;
  paidEnrollments: number;
  enrollments: number;
  completions: number;
  newUsers: number;
  certificates: number;
};

type SaleLike = {
  enrolledAt: Date;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
  status: string;
  paymentReference: string | null;
  course: { isFree: boolean; priceAud: unknown };
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function inRange(at: Date, from: Date | null, to: Date | null): boolean {
  if (from && at < from) return false;
  if (to && at >= to) return false;
  return true;
}

export function periodBounds(
  period: AdminOpsPeriod,
  now = new Date()
): { from: Date | null; to: Date | null } {
  if (period === 'all') return { from: null, to: null };
  if (period === 'this_year') return { from: startOfYear(now), to: null };
  if (period === 'this_month') {
    return { from: startOfMonth(now), to: null };
  }
  const last = startOfMonth(now);
  last.setMonth(last.getMonth() - 1);
  return { from: last, to: startOfMonth(now) };
}

export function summariseOpsPeriod(
  sales: SaleLike[],
  usersCreatedAt: Date[],
  period: AdminOpsPeriod,
  now = new Date()
): AdminOpsPeriodKpis {
  const { from, to } = periodBounds(period, now);
  let revenueAud = 0;
  let paidEnrollments = 0;
  let enrollments = 0;
  let completions = 0;
  let certificates = 0;

  for (const row of sales) {
    if (inRange(row.enrolledAt, from, to)) {
      enrollments += 1;
      if (enrollmentLooksPaid(row)) {
        paidEnrollments += 1;
        revenueAud += listPriceAudFromCourse(row.course);
      }
    }
    if (row.completedAt && inRange(row.completedAt, from, to)) {
      completions += 1;
    }
    if (row.certificateIssuedAt && inRange(row.certificateIssuedAt, from, to)) {
      certificates += 1;
    }
  }

  const newUsers = usersCreatedAt.filter((at) => inRange(at, from, to)).length;
  return {
    revenueAud: Math.round(revenueAud * 100) / 100,
    paidEnrollments,
    enrollments,
    completions,
    newUsers,
    certificates,
  };
}
