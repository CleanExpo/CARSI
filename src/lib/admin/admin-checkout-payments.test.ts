import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-764 review (class `scoped-revenue-query`): admin revenue must read every recorded checkout,
 * not only those of the learners the dashboard happens to list. The dashboard lists at most the
 * newest 2000 learners, and a deleted learner's payment record is kept (no foreign key), so a
 * revenue query scoped to the listed learners or to their enrolments drops real, unrefunded
 * sales. Older partner-linked sales (GP-767) count even when no enrolment names their session.
 */

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({
  payments: [] as Row[],
  partnerSales: [] as Row[],
  ledger: [] as Row[],
}));

function inFilter(rows: Row[], where: Row | undefined, key: string, col: string): Row[] {
  const cond = (where?.[key] as { in?: unknown[] } | undefined)?.in;
  return cond ? rows.filter((r) => cond.includes(r[col])) : rows;
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCheckoutPayment: {
      findMany: vi.fn(async (a?: { where?: Row }) =>
        inFilter(db.payments, a?.where, 'studentId', 'studentId'),
      ),
    },
    partnerReferralSale: {
      findMany: vi.fn(async (a?: { where?: Row }) =>
        inFilter(db.partnerSales, a?.where, 'transactionId', 'transactionId'),
      ),
    },
    stripeWebhookEvent: {
      findMany: vi.fn(async (a: { where: { id: { in: string[] }; type: { startsWith: string } } }) =>
        db.ledger.filter(
          (r) =>
            a.where.id.in.includes(r.id as string) &&
            String(r.type).startsWith(a.where.type.startsWith),
        ),
      ),
    },
  },
}));

const { loadCheckoutPaymentsForRevenue } = await import('./admin-checkout-payments');
const { summariseOpsPeriod } = await import('./admin-ops-metrics');

const NOV = new Date('2026-11-05T00:00:00.000Z');
const now = new Date('2026-11-23T02:00:00.000Z');

function recorded(id: string, studentId: string, cents: number): Row {
  return { checkoutSessionId: id, studentId, paidAt: NOV, amountTotalCents: cents, currency: 'aud' };
}

beforeEach(() => {
  db.payments = [];
  db.partnerSales = [];
  db.ledger = [];
});

describe('admin revenue reads every recorded checkout (GP-764 review)', () => {
  it('a payment whose learner was deleted, or is outside the listed learners, still counts', async () => {
    db.payments = [recorded('cs_listed', 'listed', 29_900), recorded('cs_gone', 'deleted', 49_900)];

    const payments = await loadCheckoutPaymentsForRevenue();

    expect(payments.map((p) => p.checkoutSessionId).sort()).toEqual(['cs_gone', 'cs_listed']);
    expect(summariseOpsPeriod([], [], 'all', now, payments).revenueRecordedAud).toBe(798);
  });

  it('an older partner sale counts with no enrolment naming it, once, and not when refunded', async () => {
    db.payments = [recorded('cs_both', 'u1', 29_900)];
    db.partnerSales = [
      { transactionId: 'cs_both', paidAt: NOV, amountPaidCents: 29_900, currency: 'aud' },
      { transactionId: 'cs_partner_only', paidAt: NOV, amountPaidCents: 19_900, currency: 'aud' },
      { transactionId: 'cs_partner_refunded', paidAt: NOV, amountPaidCents: 9_900, currency: 'aud' },
    ];
    db.ledger = [{ id: 'payment-reversed:cs_partner_refunded', type: 'payment_reversed:refunded' }];

    const payments = await loadCheckoutPaymentsForRevenue();
    const byId = Object.fromEntries(payments.map((p) => [p.checkoutSessionId, p.reversed]));

    expect(byId).toEqual({ cs_both: false, cs_partner_only: false, cs_partner_refunded: true });
    expect(summariseOpsPeriod([], [], 'all', now, payments).revenueRecordedAud).toBe(498);
  });
});
