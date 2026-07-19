import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findCourse: vi.fn(),
  findFirst: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAttributionEvent: {
      create: db.create,
      deleteMany: db.deleteMany,
      findFirst: db.findFirst,
    },
    lmsCourse: { findUnique: db.findCourse },
    $queryRaw: db.queryRaw,
  },
}));

import { ATTRIBUTION_CAMPAIGN_ID } from '@/lib/analytics/event-attribution';
import {
  getAttributionReport,
  recordAttributedStage,
  startAttributionJourney,
  tryRecordAttributedStage,
} from './event-attribution';

beforeEach(() => {
  vi.clearAllMocks();
  db.deleteMany.mockResolvedValue({ count: 0 });
  db.findCourse.mockResolvedValue({ id: 'course-id' });
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
    expect(report.totals.revenueAud).toBe(99);
    expect(db.queryRaw).toHaveBeenCalledTimes(1);
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
