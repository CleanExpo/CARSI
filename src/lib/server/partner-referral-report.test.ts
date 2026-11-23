/**
 * GP-767: the settlement CSV for a partner lists each attributed sale with the amount actually
 * paid and whether it was refunded. Refunds come from the durable Stripe reversal ledger
 * (`event_attribution_reversals`), keyed by the same checkout session id.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findSales: vi.fn(),
  findReversals: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    partnerReferralSale: { findMany: mocks.findSales },
    eventAttributionReversal: { findMany: mocks.findReversals },
  },
}));

import { getPartnerReferralSalesCsv } from '@/lib/server/partner-referral-sales';

const SALES = [
  {
    transactionId: 'cs_kept',
    partnerId: 'ccw',
    courseSlug: 'ccw-carsi-truckmount-operations',
    amountPaidCents: 9_900,
    currency: 'AUD',
    paidAt: new Date('2026-11-23T01:00:00.000Z'),
    rewardOption: 'A',
    termsVersion: 1,
  },
  {
    transactionId: 'cs_refunded',
    partnerId: 'ccw',
    courseSlug: 'carpet-cleaning-basics',
    amountPaidCents: 4_900,
    currency: 'AUD',
    paidAt: new Date('2026-11-24T02:30:00.000Z'),
    rewardOption: 'A',
    termsVersion: 1,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findSales.mockResolvedValue(SALES);
  mocks.findReversals.mockResolvedValue([
    {
      stripeEventId: 'evt_refund_1',
      providerObjectId: null,
      transactionId: 'cs_refunded',
      reversedRevenueCents: 4_900,
      reason: 'refunded',
      eventAt: new Date('2026-11-25T00:00:00.000Z'),
    },
  ]);
});

describe('partner referral settlement CSV (GP-767)', () => {
  it('shows a refund against the refunded sale and not against the kept one', async () => {
    const csv = await getPartnerReferralSalesCsv('ccw');
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe('date,partner,course,amount_paid,currency,gst_estimate,net_ex_gst_estimate,refunded,refunded_amount,dispute_not_won,reward_option,terms_version,stripe_checkout_session');
    expect(lines[1]).toBe('2026-11-23,ccw,ccw-carsi-truckmount-operations,99.00,AUD,9.00,90.00,no,0.00,no,A,1,cs_kept');
    expect(lines[2]).toBe('2026-11-24,ccw,carpet-cleaning-basics,49.00,AUD,4.45,44.55,yes,49.00,no,A,1,cs_refunded');
    expect(mocks.findSales).toHaveBeenCalledWith(
      expect.objectContaining({ where: { partnerId: 'ccw' } })
    );
    expect(mocks.findReversals).toHaveBeenCalledWith(
      expect.objectContaining({ where: { transactionId: { in: ['cs_kept', 'cs_refunded'] } } })
    );
  });

  it('a partial refund shows yes with the refunded amount', async () => {
    mocks.findReversals.mockResolvedValue([
      { stripeEventId: 'evt_p1', providerObjectId: null, transactionId: 'cs_kept', reversedRevenueCents: 1_000, reason: 'refunded', eventAt: new Date('2026-11-25T00:00:00.000Z') },
      { stripeEventId: 'evt_p2', providerObjectId: null, transactionId: 'cs_kept', reversedRevenueCents: 2_500, reason: 'refunded', eventAt: new Date('2026-11-26T00:00:00.000Z') },
    ]);
    const lines = (await getPartnerReferralSalesCsv('ccw')).trim().split('\n');
    expect(lines[1]).toBe('2026-11-23,ccw,ccw-carsi-truckmount-operations,99.00,AUD,9.00,90.00,yes,25.00,no,A,1,cs_kept');
  });

  it('an open dispute shows as disputed; a won dispute does not', async () => {
    mocks.findReversals.mockResolvedValue([
      { stripeEventId: 'evt_d1', providerObjectId: 'dp_1', transactionId: 'cs_kept', reversedRevenueCents: 9_900, reason: 'disputed', eventAt: new Date('2026-11-25T00:00:00.000Z') },
      { stripeEventId: 'evt_d2', providerObjectId: 'dp_2', transactionId: 'cs_refunded', reversedRevenueCents: 4_900, reason: 'disputed', eventAt: new Date('2026-11-25T00:00:00.000Z') },
      { stripeEventId: 'evt_d3', providerObjectId: 'dp_2', transactionId: 'cs_refunded', reversedRevenueCents: 0, reason: 'dispute_won', eventAt: new Date('2026-11-27T00:00:00.000Z') },
    ]);
    const lines = (await getPartnerReferralSalesCsv('ccw')).trim().split('\n');
    expect(lines[1].endsWith(',no,0.00,yes,A,1,cs_kept')).toBe(true);
    expect(lines[2].endsWith(',no,0.00,no,A,1,cs_refunded')).toBe(true);
  });

  it('caps the refunded amount at the amount paid', async () => {
    mocks.findReversals.mockResolvedValue([
      { stripeEventId: 'evt_big', providerObjectId: null, transactionId: 'cs_kept', reversedRevenueCents: 50_000, reason: 'refunded', eventAt: new Date('2026-11-25T00:00:00.000Z') },
    ]);
    const lines = (await getPartnerReferralSalesCsv('ccw')).trim().split('\n');
    expect(lines[1]).toBe('2026-11-23,ccw,ccw-carsi-truckmount-operations,99.00,AUD,9.00,90.00,yes,99.00,no,A,1,cs_kept');
  });

  it('no sales gives the header only and reads no reversals', async () => {
    mocks.findSales.mockResolvedValue([]);
    const csv = await getPartnerReferralSalesCsv('ccw');
    expect(csv).toBe('date,partner,course,amount_paid,currency,gst_estimate,net_ex_gst_estimate,refunded,refunded_amount,dispute_not_won,reward_option,terms_version,stripe_checkout_session\n');
    expect(mocks.findReversals).not.toHaveBeenCalled();
  });

  it('dates a sale by its Brisbane business day', async () => {
    mocks.findSales.mockResolvedValue([{ ...SALES[0], paidAt: new Date('2026-11-23T15:30:00.000Z') }]);
    mocks.findReversals.mockResolvedValue([]);
    const lines = (await getPartnerReferralSalesCsv('ccw')).trim().split('\n');
    expect(lines[1].startsWith('2026-11-24,')).toBe(true);
  });

  it('a sale recorded without terms shows blank terms columns, never a guessed option', async () => {
    mocks.findSales.mockResolvedValue([{ ...SALES[0], rewardOption: null, termsVersion: null }]);
    mocks.findReversals.mockResolvedValue([]);
    const lines = (await getPartnerReferralSalesCsv('ccw')).trim().split('\n');
    expect(lines[1]).toBe('2026-11-23,ccw,ccw-carsi-truckmount-operations,99.00,AUD,9.00,90.00,no,0.00,no,,,cs_kept');
  });

  it('an unknown partner is refused rather than returning an empty report', async () => {
    await expect(getPartnerReferralSalesCsv('someone-else')).rejects.toThrow(/unknown referral partner/i);
    expect(mocks.findSales).not.toHaveBeenCalled();
  });
});
