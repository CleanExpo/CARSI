import { type AdminOpsPeriod } from '@/lib/admin/admin-ops-format';
import { isStripeCheckoutPaymentReference } from '@/lib/lms/course-prerequisites';

export { formatAud, formatRevenueAud, REVENUE_PRICE_UNKNOWN_LABEL } from '@/lib/admin/admin-ops-format';
export type { AdminOpsPeriod };

/**
 * GP-763. The one rule for "this enrolment was paid for": a Stripe Checkout session id
 * (`cs_...`) that has not been refunded or revoked. Free (`free`), admin (`admin:*`), team
 * seat (`team:*`, `team-seat:*`), membership, org, discount and attendance grants are not
 * payments. Allow-list on purpose: a new kind of grant is unpaid until proven otherwise.
 */
export function enrollmentIsStripePaid(e: {
  status: string;
  paymentReference: string | null;
}): boolean {
  const status = (e.status ?? '').toLowerCase();
  if (status === 'refunded' || status === 'revoked') return false;
  return isStripeCheckoutPaymentReference(e.paymentReference);
}

/**
 * GP-763. The database stores no amount paid per enrolment, only the Stripe session id, and
 * a course's price today says nothing about what an earlier learner paid. So revenue is
 * known only when there is nothing to value: 0 with no paid enrolments, otherwise null
 * ("price at purchase unknown"). Never derive it from the course's current list price.
 */
export function revenueAudForPaidCount(paidEnrollments: number): number | null {
  return paidEnrollments > 0 ? null : 0;
}

/**
 * GP-764: one paid course checkout as recorded at fulfilment (`lms_checkout_payments`), or a
 * partner referral sale for an older session (same Stripe `amount_total`). `reversed` is the
 * session's reversal marker (full refund, or a dispute not won).
 */
export type CheckoutPaymentLike = {
  checkoutSessionId: string;
  /** When the checkout was paid (its Stripe session's creation time); periods are windowed on it. */
  paidAt: Date;
  amountTotalCents: number | null;
  currency: string | null;
  reversed: boolean;
};

/** A recorded payment whose dollars are known: not reversed, a whole amount, in AUD. */
function knownAudCents(p: CheckoutPaymentLike): number | null {
  if (p.reversed || p.amountTotalCents === null) return null;
  return (p.currency ?? '').toLowerCase() === 'aud' ? p.amountTotalCents : null;
}

export type AdminOpsPeriodKpis = {
  /**
   * The window's revenue when every paid checkout in it has a recorded amount; null while any
   * paid enrolment in it has none (price at purchase unknown; see the two fields below).
   */
  revenueAud: number | null;
  /** GP-764: AUD actually paid in the window, from recorded checkouts not refunded or disputed. */
  revenueRecordedAud: number;
  /**
   * GP-764: paid checkouts in the window whose amount is not known: Stripe-paid enrolments
   * with no recorded payment (paid before amounts were stored), and recorded payments with no
   * amount or not in AUD. Never valued at a course's price today.
   */
  paidPriceUnknown: number;
  /** Stripe-paid enrolments (one per Checkout session and learner; a team purchase is one). */
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
  now = new Date(),
  payments: CheckoutPaymentLike[] = []
): AdminOpsPeriodKpis {
  const { from, to } = periodBounds(period, now);
  const recorded = new Set(payments.map((p) => p.checkoutSessionId));
  let paidEnrollments = 0;
  let paidPriceUnknown = 0;
  let enrollments = 0;
  let completions = 0;
  let certificates = 0;

  for (const row of sales) {
    if (inRange(row.enrolledAt, from, to)) {
      enrollments += 1;
      if (enrollmentIsStripePaid(row)) {
        paidEnrollments += 1;
        // Its session's dollars come from the payment record (counted below), when there is one.
        if (!recorded.has((row.paymentReference ?? '').trim())) paidPriceUnknown += 1;
      }
    }
    if (row.completedAt && inRange(row.completedAt, from, to)) {
      completions += 1;
    }
    if (row.certificateIssuedAt && inRange(row.certificateIssuedAt, from, to)) {
      certificates += 1;
    }
  }

  // One record per Stripe session: a team purchase is counted once, for all its seats.
  let recordedCents = 0;
  for (const p of payments) {
    if (p.reversed || !inRange(p.paidAt, from, to)) continue;
    const cents = knownAudCents(p);
    if (cents === null) paidPriceUnknown += 1;
    else recordedCents += cents;
  }
  const revenueRecordedAud = recordedCents / 100;

  const newUsers = usersCreatedAt.filter((at) => inRange(at, from, to)).length;
  return {
    // With no payment records this is GP-763's rule unchanged: 0 with no paid enrolments, else null.
    revenueAud: paidPriceUnknown === 0 ? revenueRecordedAud : null,
    revenueRecordedAud,
    paidPriceUnknown,
    paidEnrollments,
    enrollments,
    completions,
    newUsers,
    certificates,
  };
}

export type AdminOpsMonth = {
  month: string;
  paidEnrollments: number;
  enrollments: number;
  completions: number;
};

/** The last eight calendar months, oldest first. */
export function summariseOpsMonthly(sales: SaleLike[], now = new Date()): AdminOpsMonth[] {
  const months: AdminOpsMonth[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    let paidEnrollments = 0;
    let enrollments = 0;
    let completions = 0;
    for (const e of sales) {
      if (e.enrolledAt >= cursor && e.enrolledAt < next) {
        enrollments += 1;
        if (enrollmentIsStripePaid(e)) paidEnrollments += 1;
      }
      if (e.completedAt && e.completedAt >= cursor && e.completedAt < next) {
        completions += 1;
      }
    }
    months.push({ month: key, paidEnrollments, enrollments, completions });
  }
  return months;
}

export type AdminOpsTopCourse = { title: string; paidEnrollments: number };

/** Courses ranked by Stripe-paid enrolments (not by price), top eight. */
export function topCoursesByPaidEnrollments(
  sales: (SaleLike & { courseId: string; course: { title: string } })[]
): AdminOpsTopCourse[] {
  const byCourse = new Map<string, AdminOpsTopCourse>();
  for (const e of sales) {
    if (!enrollmentIsStripePaid(e)) continue;
    const row = byCourse.get(e.courseId) ?? { title: e.course.title, paidEnrollments: 0 };
    row.paidEnrollments += 1;
    byCourse.set(e.courseId, row);
  }
  return Array.from(byCourse.values())
    .sort((a, b) => b.paidEnrollments - a.paidEnrollments)
    .slice(0, 8);
}
