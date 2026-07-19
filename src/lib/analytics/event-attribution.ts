export const ATTRIBUTION_CAMPAIGN_ID = 'carsi_ccw_growth_days_2026' as const;
export const ATTRIBUTION_COOKIE_NAME = 'carsi_event_attribution' as const;
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 45;

export const ATTRIBUTION_SOURCE_IDS = [
  'melbourne_qr',
  'melbourne_email',
  'sydney_qr',
  'sydney_email',
] as const;

export const ATTRIBUTION_STAGES = [
  'event_registration',
  'course_view',
  'checkout_started',
  'purchase',
  'subscription',
] as const;

export type AttributionSourceId = (typeof ATTRIBUTION_SOURCE_IDS)[number];
export type AttributionStage = (typeof ATTRIBUTION_STAGES)[number];
export type AttributedEventSlug = 'melbourne' | 'sydney';

export type AttributionSource = {
  campaignId: typeof ATTRIBUTION_CAMPAIGN_ID;
  sourceId: AttributionSourceId;
  eventSlug: AttributedEventSlug;
};

export type AttributionEventRecord = AttributionSource & {
  journeyId: string;
  stage: AttributionStage;
  courseSlug: string | null;
  revenueCents: number | null;
  transactionId: string | null;
};

export type AttributionReportRow = {
  sourceId: AttributionSourceId;
  event_registration: number;
  course_view: number;
  checkout_started: number;
  purchase: number;
  subscription: number;
  revenueAud: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function parseAttributionJourneyId(value: string | null | undefined): string | null {
  if (!value || !UUID_PATTERN.test(value)) return null;
  return value;
}

export function buildAttributionSource(
  eventSlug: string,
  sourceId: string | null | undefined,
  campaignId: string | null | undefined,
): AttributionSource | null {
  if ((sourceId == null || sourceId === '') && (campaignId == null || campaignId === '')) {
    return null;
  }
  if (campaignId !== ATTRIBUTION_CAMPAIGN_ID) {
    throw new Error('INVALID_ATTRIBUTION_SOURCE');
  }
  if (eventSlug !== 'melbourne' && eventSlug !== 'sydney') {
    throw new Error('INVALID_ATTRIBUTION_SOURCE');
  }
  if (
    typeof sourceId !== 'string' ||
    !(ATTRIBUTION_SOURCE_IDS as readonly string[]).includes(sourceId)
  ) {
    throw new Error('INVALID_ATTRIBUTION_SOURCE');
  }
  const validSourceId = sourceId as AttributionSourceId;
  if (!validSourceId.startsWith(`${eventSlug}_`)) {
    throw new Error('INVALID_ATTRIBUTION_SOURCE');
  }
  return {
    campaignId: ATTRIBUTION_CAMPAIGN_ID,
    sourceId: validSourceId,
    eventSlug,
  };
}

export function aggregateAttributionEvents(rows: AttributionEventRecord[]) {
  const bySource = new Map<AttributionSourceId, AttributionReportRow>();
  const totalStageJourneys = new Map<AttributionStage, Set<string>>(
    ATTRIBUTION_STAGES.map((stage) => [stage, new Set<string>()]),
  );
  const seenSourceStageJourneys = new Set<string>();
  const seenTransactions = new Set<string>();
  let totalRevenueCents = 0;

  for (const row of rows) {
    let report = bySource.get(row.sourceId);
    if (!report) {
      report = {
        sourceId: row.sourceId,
        event_registration: 0,
        course_view: 0,
        checkout_started: 0,
        purchase: 0,
        subscription: 0,
        revenueAud: 0,
      };
      bySource.set(row.sourceId, report);
    }

    totalStageJourneys.get(row.stage)?.add(row.journeyId);

    const sourceStageKey = `${row.sourceId}:${row.stage}:${row.journeyId}`;
    if (!seenSourceStageJourneys.has(sourceStageKey)) {
      report[row.stage] += 1;
      seenSourceStageJourneys.add(sourceStageKey);
    }

    if ((row.stage === 'purchase' || row.stage === 'subscription') && row.revenueCents) {
      const transactionKey = row.transactionId
        ? `${row.stage}:${row.transactionId}`
        : `${row.stage}:${row.journeyId}:${row.revenueCents}`;
      if (!seenTransactions.has(transactionKey)) {
        seenTransactions.add(transactionKey);
        report.revenueAud += row.revenueCents / 100;
        totalRevenueCents += row.revenueCents;
      }
    }
  }

  return {
    campaignId: ATTRIBUTION_CAMPAIGN_ID,
    totals: {
      event_registration: totalStageJourneys.get('event_registration')?.size ?? 0,
      course_view: totalStageJourneys.get('course_view')?.size ?? 0,
      checkout_started: totalStageJourneys.get('checkout_started')?.size ?? 0,
      purchase: totalStageJourneys.get('purchase')?.size ?? 0,
      subscription: totalStageJourneys.get('subscription')?.size ?? 0,
      revenueAud: totalRevenueCents / 100,
    },
    sources: [...bySource.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  };
}
