import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  findCourse: vi.fn(),
  findFirst: vi.fn(),
  queryRaw: vi.fn(),
  reversalCreate: vi.fn(),
  reversalFindUnique: vi.fn(),
  reversalFindMany: vi.fn(),
  reversalUpdateMany: vi.fn(),
  transaction: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAttributionEvent: {
      create: db.create,
      deleteMany: db.deleteMany,
      findMany: db.findMany,
      findFirst: db.findFirst,
      updateMany: db.updateMany,
    },
    eventAttributionReversal: {
      create: db.reversalCreate,
      findUnique: db.reversalFindUnique,
      findMany: db.reversalFindMany,
      updateMany: db.reversalUpdateMany,
    },
    lmsCourse: { findUnique: db.findCourse },
    $transaction: db.transaction,
    $queryRaw: db.queryRaw,
  },
}));

import { ATTRIBUTION_CAMPAIGN_ID } from '@/lib/analytics/event-attribution';
import {
  getAttributionReport,
  persistAttributedRevenueReversal,
  recordAttributedStage,
  reduceAttributionReversals,
  startAttributionJourney,
  tryRecordAttributedStage,
} from './event-attribution';

beforeEach(() => {
  vi.clearAllMocks();
  db.findMany.mockResolvedValue([]);
  db.reversalFindMany.mockResolvedValue([]);
  db.reversalUpdateMany.mockResolvedValue({ count: 0 });
  db.updateMany.mockResolvedValue({ count: 0 });
  db.deleteMany.mockResolvedValue({ count: 0 });
  db.findCourse.mockResolvedValue({ id: 'course-id' });
  db.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      eventAttributionEvent: {
        create: db.create,
        findMany: db.findMany,
        updateMany: db.updateMany,
      },
      eventAttributionReversal: {
        create: db.reversalCreate,
        findUnique: db.reversalFindUnique,
        findMany: db.reversalFindMany,
        updateMany: db.reversalUpdateMany,
      },
    }),
  );
});

describe('event attribution persistence', () => {
  it('starts a pseudonymous journey using only the allowlisted contract', async () => {
    db.create.mockResolvedValueOnce({});

    const journeyId = await startAttributionJourney({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'melbourne_qr',
      eventSlug: 'melbourne',
    });

    expect(journeyId).toMatch(/^[0-9a-f-]{36}$/);
    expect(db.create).toHaveBeenCalledWith({
      data: {
        journeyId,
        campaignId: ATTRIBUTION_CAMPAIGN_ID,
        sourceId: 'melbourne_qr',
        eventSlug: 'melbourne',
        stage: 'event_registration',
      },
    });
    expect(JSON.stringify(db.create.mock.calls[0])).not.toMatch(/email|phone|name|user/i);
  });

  it('inherits source from registration and normalises checkout details', async () => {
    db.findFirst.mockResolvedValueOnce({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'sydney_email',
      eventSlug: 'sydney',
    });
    db.create.mockResolvedValueOnce({});

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'checkout_started', {
        courseSlug: '  Course-Slug  ',
        revenueCents: 9900.4,
        currency: 'aud',
        transactionId: ' cs_test ',
      }),
    ).resolves.toBe(true);

    expect(db.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceId: 'sydney_email',
        courseSlug: 'course-slug',
        revenueCents: 9900,
        currency: 'AUD',
        transactionId: 'cs_test',
      }),
    });
  });

  it('treats a duplicate transaction as an idempotent no-op', async () => {
    db.findFirst.mockResolvedValueOnce({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'melbourne_qr',
      eventSlug: 'melbourne',
    });
    db.create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'purchase', {
        transactionId: 'cs_1',
      }),
    ).resolves.toBe(false);
  });

  it('treats a repeated journey, stage and course as an idempotent no-op', async () => {
    db.findFirst.mockResolvedValueOnce({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'melbourne_qr',
      eventSlug: 'melbourne',
    });
    db.create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'course_view', {
        courseSlug: 'course-a',
      }),
    ).resolves.toBe(false);
  });

  it('rejects an arbitrary course slug so one journey is bounded by the real catalogue', async () => {
    db.findCourse.mockResolvedValueOnce(null);

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'course_view', {
        courseSlug: 'attacker-generated-slug',
      }),
    ).resolves.toBe(false);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('rejects non-AUD realised revenue rather than mislabelling it', async () => {
    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'purchase', {
        revenueCents: 9900,
        currency: 'usd',
        transactionId: 'cs_usd',
      }),
    ).resolves.toBe(false);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('uses complete SQL aggregation so more than 10,000 earlier views cannot hide later revenue', async () => {
    db.queryRaw.mockResolvedValueOnce([
      {
        source_id: 'melbourne_qr',
        stage: 'course_view',
        journey_count: 1,
        revenue_cents: 0n,
        total_row_count: 10_002n,
      },
      {
        source_id: 'melbourne_qr',
        stage: 'purchase',
        journey_count: 1,
        revenue_cents: 9_900n,
        total_row_count: 10_002n,
      },
    ]);

    const report = await getAttributionReport();

    expect(report.rowCount).toBe(10_002);
    expect(report.complete).toBe(true);
    expect(report.totals.purchase).toBe(1);
    expect(report.totals.netRevenueAud).toBe(99);
    expect(db.queryRaw).toHaveBeenCalledTimes(1);
  });


  it('durably records an early partial refund before the paid attribution row exists', async () => {
    const reversedAt = new Date('2026-07-19T10:00:00.000Z');
    db.reversalCreate.mockResolvedValueOnce({ id: 'reversal-row' });
    db.findMany.mockResolvedValueOnce([]);

    await expect(
      persistAttributedRevenueReversal('cs_early', {
        eventId: 'evt_early_refund',
        eventAt: reversedAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'aud',
      }),
    ).resolves.toEqual({ status: 'pending', appliedRows: 0 });

    expect(db.reversalCreate).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_early_refund',
        providerObjectId: null,
        transactionId: 'cs_early',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
        reason: 'refunded',
        eventAt: reversedAt,
      },
    });
  });

  it('replays an identical Stripe event idempotently without inserting another ledger fact', async () => {
    const eventAt = new Date('2026-07-19T10:00:00.000Z');
    db.reversalCreate.mockRejectedValueOnce({ code: 'P2002' });
    db.reversalFindUnique.mockResolvedValueOnce({
      transactionId: 'cs_early',
      providerObjectId: null,
      reversedRevenueCents: 2_500,
      currency: 'AUD',
      reason: 'refunded',
      eventAt,
    });

    await expect(
      persistAttributedRevenueReversal('cs_early', {
        eventId: 'evt_early_refund',
        eventAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      }),
    ).resolves.toEqual({ status: 'duplicate', appliedRows: 0 });

    expect(db.reversalCreate).toHaveBeenCalledTimes(1);
    expect(db.reversalFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { stripeEventId: 'evt_early_refund' } }),
    );
    expect(db.transaction).toHaveBeenCalledTimes(2);
  });

  it('keeps a mismatched-currency reversal out of the AUD materialised row', async () => {
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce([
      {
        stripeEventId: 'evt_usd',
        eventAt: new Date('2026-07-19T10:00:00.000Z'),
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'USD',
      },
    ]);

    await expect(
      persistAttributedRevenueReversal('cs_paid', {
        eventId: 'evt_usd',
        eventAt: new Date('2026-07-19T10:00:00.000Z'),
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'USD',
      }),
    ).resolves.toEqual({ status: 'currency_mismatch', appliedRows: 0 });

    expect(db.updateMany).not.toHaveBeenCalled();
    expect(db.reversalUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId: 'cs_paid', currency: { not: 'AUD' } },
        data: expect.objectContaining({ status: 'currency_mismatch' }),
      }),
    );
  });

  it('reduces cumulative refunds and dispute lifecycle deterministically', () => {
    const at = new Date('2026-07-19T10:00:00.000Z');
    const later = new Date('2026-07-19T10:00:01.000Z');

    expect(
      reduceAttributionReversals([
        { stripeEventId: 'evt_r1', eventAt: at, reason: 'refunded', reversedRevenueCents: 2_500 },
        { stripeEventId: 'evt_r2', eventAt: later, reason: 'refunded', reversedRevenueCents: 5_000 },
      ]),
    ).toEqual({ reversedRevenueCents: 5_000, reason: 'refunded', eventId: 'evt_r2', eventAt: later });

    expect(
      reduceAttributionReversals([
        { stripeEventId: 'evt_dispute', eventAt: at, reason: 'disputed', reversedRevenueCents: 9_900 },
        { stripeEventId: 'evt_won', eventAt: at, reason: 'dispute_won', reversedRevenueCents: 0 },
      ]),
    ).toEqual({ reversedRevenueCents: 0, reason: 'dispute_won', eventId: 'evt_won', eventAt: at });

    expect(
      reduceAttributionReversals([
        { stripeEventId: 'evt_refund', eventAt: at, reason: 'refunded', reversedRevenueCents: 2_500 },
        { stripeEventId: 'evt_dispute', eventAt: at, reason: 'disputed', reversedRevenueCents: 9_900 },
        { stripeEventId: 'evt_won', eventAt: later, reason: 'dispute_won', reversedRevenueCents: 0 },
      ]),
    ).toEqual({ reversedRevenueCents: 2_500, reason: 'refunded', eventId: 'evt_refund', eventAt: at });
  });

  it('aggregates refunds with distinct active partial disputes', () => {
    const at = new Date('2026-07-19T10:00:00.000Z');

    expect(
      reduceAttributionReversals([
        { stripeEventId: 'evt_refund', providerObjectId: null, eventAt: at, reason: 'refunded', reversedRevenueCents: 2_500 },
        { stripeEventId: 'evt_dispute_a', providerObjectId: 'dp_a', eventAt: at, reason: 'disputed', reversedRevenueCents: 3_000 },
        { stripeEventId: 'evt_dispute_b', providerObjectId: 'dp_b', eventAt: at, reason: 'disputed', reversedRevenueCents: 4_500 },
      ]),
    ).toEqual({ reversedRevenueCents: 10_000, reason: 'disputed', eventId: 'evt_dispute_b', eventAt: at });
  });

  it('closes only the won dispute while preserving other active disputes', () => {
    const at = new Date('2026-07-19T10:00:00.000Z');
    const later = new Date('2026-07-19T10:00:01.000Z');

    expect(
      reduceAttributionReversals([
        { stripeEventId: 'evt_dispute_a', providerObjectId: 'dp_a', eventAt: at, reason: 'disputed', reversedRevenueCents: 3_000 },
        { stripeEventId: 'evt_dispute_b', providerObjectId: 'dp_b', eventAt: at, reason: 'disputed', reversedRevenueCents: 4_000 },
        { stripeEventId: 'evt_won_a', providerObjectId: 'dp_a', eventAt: later, reason: 'dispute_won', reversedRevenueCents: 0 },
      ]),
    ).toEqual({ reversedRevenueCents: 4_000, reason: 'disputed', eventId: 'evt_dispute_b', eventAt: at });
  });

  it('classifies a lower cumulative refund delivered after the applied maximum as stale', async () => {
    const earlier = new Date('2026-07-19T10:00:00.000Z');
    const later = new Date('2026-07-19T10:00:01.000Z');
    db.reversalCreate.mockResolvedValueOnce({ id: 'stale-reversal-row' });
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce([
      {
        stripeEventId: 'evt_refund_max',
        eventAt: earlier,
        reason: 'refunded',
        reversedRevenueCents: 5_000,
        currency: 'AUD',
      },
      {
        stripeEventId: 'evt_refund_stale',
        eventAt: later,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      },
    ]);
    db.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      persistAttributedRevenueReversal('cs_paid', {
        eventId: 'evt_refund_stale',
        eventAt: later,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      }),
    ).resolves.toEqual({ status: 'stale', appliedRows: 1 });

    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversedRevenueCents: 5_000,
          reversalEventId: 'evt_refund_max',
        }),
      }),
    );
  });

  it('atomically reconciles a pending early refund when the paid row arrives', async () => {
    const reversedAt = new Date('2026-07-19T10:00:00.000Z');
    db.findFirst.mockResolvedValueOnce({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'melbourne_qr',
      eventSlug: 'melbourne',
    });
    db.create.mockResolvedValueOnce({ id: 'paid-row' });
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce([
      {
        stripeEventId: 'evt_early_refund',
        eventAt: reversedAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      },
    ]);
    db.updateMany.mockResolvedValueOnce({ count: 1 });
    db.reversalUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'purchase', {
        courseSlug: 'course-a',
        revenueCents: 9_900,
        currency: 'aud',
        transactionId: 'cs_early',
      }),
    ).resolves.toBe(true);

    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: 'paid-row' },
      data: {
        reversedRevenueCents: 2_500,
        reversalReason: 'refunded',
        reversalEventId: 'evt_early_refund',
        reversalEventAt: reversedAt,
      },
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it.each(['reversal-first', 'paid-first'] as const)(
    'materialises the same result when serializable writers race %s',
    async (commitOrder) => {
      const eventAt = new Date('2026-07-19T10:00:00.000Z');
      const reversals: Array<{
        stripeEventId: string;
        providerObjectId: null;
        eventAt: Date;
        reason: 'refunded';
        reversedRevenueCents: number;
        currency: string;
      }> = [];
      let paid = false;
      let materialised = 0;
      let releasePrevious = Promise.resolve();

      db.findFirst.mockResolvedValue({
        campaignId: ATTRIBUTION_CAMPAIGN_ID,
        sourceId: 'melbourne_qr',
        eventSlug: 'melbourne',
      });
      db.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const previous = releasePrevious;
        let release!: () => void;
        releasePrevious = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        try {
          return await fn({
            eventAttributionEvent: {
              create: async () => { paid = true; },
              findMany: async () => paid ? [{ id: 'paid-row', revenueCents: 9_900, currency: 'AUD' }] : [],
              updateMany: async ({ data }: { data: { reversedRevenueCents: number } }) => {
                materialised = data.reversedRevenueCents;
                return { count: 1 };
              },
            },
            eventAttributionReversal: {
              create: async ({ data }: { data: (typeof reversals)[number] }) => { reversals.push(data); },
              findUnique: async () => null,
              findMany: async () => reversals,
              updateMany: async () => ({ count: 1 }),
            },
          });
        } finally {
          release();
        }
      });

      const paidWrite = () => recordAttributedStage(
        '44444444-4444-4444-8444-444444444444',
        'purchase',
        { revenueCents: 9_900, currency: 'AUD', transactionId: 'cs_race' },
      );
      const reversalWrite = () => persistAttributedRevenueReversal('cs_race', {
        eventId: 'evt_race_refund',
        eventAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      });

      await Promise.all(commitOrder === 'reversal-first'
        ? [reversalWrite(), paidWrite()]
        : [paidWrite(), reversalWrite()]);

      expect(materialised).toBe(2_500);
      expect(reversals).toHaveLength(1);
      expect(paid).toBe(true);
    },
  );

  it.each([
    {
      name: 'cumulative partial refunds',
      reversals: [
        { stripeEventId: 'evt_refund_25', eventAt: new Date('2026-07-19T10:00:00.000Z'), reason: 'refunded', reversedRevenueCents: 2_500, currency: 'AUD' },
        { stripeEventId: 'evt_refund_50', eventAt: new Date('2026-07-19T10:01:00.000Z'), reason: 'refunded', reversedRevenueCents: 5_000, currency: 'AUD' },
      ],
      expectedCents: 5_000,
      expectedReason: 'refunded',
      expectedEventId: 'evt_refund_50',
    },
    {
      name: 'full refund',
      reversals: [
        { stripeEventId: 'evt_refund_full', eventAt: new Date('2026-07-19T10:00:00.000Z'), reason: 'refunded', reversedRevenueCents: 9_900, currency: 'AUD' },
      ],
      expectedCents: 9_900,
      expectedReason: 'refunded',
      expectedEventId: 'evt_refund_full',
    },
    {
      name: 'open dispute',
      reversals: [
        { stripeEventId: 'evt_dispute', eventAt: new Date('2026-07-19T10:00:00.000Z'), reason: 'disputed', reversedRevenueCents: 9_900, currency: 'AUD' },
      ],
      expectedCents: 9_900,
      expectedReason: 'disputed',
      expectedEventId: 'evt_dispute',
    },
    {
      name: 'same-second dispute won after dispute creation',
      reversals: [
        { stripeEventId: 'evt_won', eventAt: new Date('2026-07-19T10:00:00.000Z'), reason: 'dispute_won', reversedRevenueCents: 0, currency: 'AUD' },
        { stripeEventId: 'evt_dispute', eventAt: new Date('2026-07-19T10:00:00.000Z'), reason: 'disputed', reversedRevenueCents: 9_900, currency: 'AUD' },
      ],
      expectedCents: 0,
      expectedReason: 'dispute_won',
      expectedEventId: 'evt_won',
    },
  ])('reconciles early $name when the paid row arrives', async ({
    reversals,
    expectedCents,
    expectedReason,
    expectedEventId,
  }) => {
    db.findFirst.mockResolvedValueOnce({
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      sourceId: 'melbourne_qr',
      eventSlug: 'melbourne',
    });
    db.create.mockResolvedValueOnce({ id: 'paid-row' });
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce(reversals);
    db.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      recordAttributedStage('44444444-4444-4444-8444-444444444444', 'purchase', {
        revenueCents: 9_900,
        currency: 'AUD',
        transactionId: 'cs_early_matrix',
      }),
    ).resolves.toBe(true);

    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversedRevenueCents: expectedCents,
          reversalReason: expectedReason,
          reversalEventId: expectedEventId,
        }),
      }),
    );
  });

  it('keeps the paid-first partial-refund control correct', async () => {
    const eventAt = new Date('2026-07-19T10:00:00.000Z');
    db.reversalCreate.mockResolvedValueOnce({ id: 'paid-first-reversal' });
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce([
      {
        stripeEventId: 'evt_paid_first_refund',
        eventAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      },
    ]);
    db.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(
      persistAttributedRevenueReversal('cs_paid_first', {
        eventId: 'evt_paid_first_refund',
        eventAt,
        reason: 'refunded',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
      }),
    ).resolves.toEqual({ status: 'applied', appliedRows: 1 });

    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reversedRevenueCents: 2_500 }),
      }),
    );
  });

  it('fails retryably instead of truncating an oversized reversal history', async () => {
    db.reversalCreate.mockResolvedValueOnce({ id: 'overflow-reversal' });
    db.findMany.mockResolvedValueOnce([
      { id: 'paid-row', revenueCents: 9_900, currency: 'AUD' },
    ]);
    db.reversalFindMany.mockResolvedValueOnce(
      Array.from({ length: 1_001 }, (_, index) => ({
        stripeEventId: `evt_overflow_${index}`,
        eventAt: new Date('2026-07-19T10:00:00.000Z'),
        reason: 'refunded',
        reversedRevenueCents: index,
        currency: 'AUD',
      })),
    );

    await expect(
      persistAttributedRevenueReversal('cs_overflow', {
        eventId: 'evt_overflow_1000',
        eventAt: new Date('2026-07-19T10:00:00.000Z'),
        reason: 'refunded',
        reversedRevenueCents: 1_000,
        currency: 'AUD',
      }),
    ).rejects.toThrow('reconciliation limit exceeded');
    expect(db.updateMany).not.toHaveBeenCalled();
  });


  it('fails open when attribution storage is unavailable', async () => {
    db.findFirst.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      tryRecordAttributedStage(
        '44444444-4444-4444-8444-444444444444',
        'course_view',
        { courseSlug: 'course-a' },
      ),
    ).resolves.toBe(false);
  });
});
