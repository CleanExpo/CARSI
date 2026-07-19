import { randomUUID } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';

import {
  ATTRIBUTION_CAMPAIGN_ID,
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_SOURCE_IDS,
  ATTRIBUTION_STAGES,
  parseAttributionJourneyId,
  type AttributionReportRow,
  type AttributionSource,
  type AttributionSourceId,
  type AttributionStage,
} from '@/lib/analytics/event-attribution';
import { prisma } from '@/lib/prisma';

export const ATTRIBUTION_RETENTION_DAYS = 90;

type StageDetails = {
  courseSlug?: string;
  revenueCents?: number;
  currency?: string | null;
  transactionId?: string;
};

type AggregatedAttributionRow = {
  source_id: AttributionSourceId;
  stage: AttributionStage;
  journey_count: number;
  revenue_cents: bigint;
  total_row_count: bigint;
};

function normaliseCourseSlug(value: string | undefined): string | null {
  const slug = value?.trim().toLowerCase();
  return slug ? slug.slice(0, 200) : null;
}

function normaliseRevenueCents(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function retentionCutoff(): Date {
  return new Date(Date.now() - ATTRIBUTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function pruneExpiredAttributionEvents(): Promise<void> {
  try {
    await prisma.eventAttributionEvent.deleteMany({ where: { createdAt: { lt: retentionCutoff() } } });
  } catch (error) {
    console.error('[event-attribution] retention prune failed:', error);
  }
}

export function readAttributionJourneyId(request: NextRequest): string | null {
  return parseAttributionJourneyId(request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value);
}

export function setAttributionJourneyCookie(response: NextResponse, journeyId: string): void {
  response.cookies.set(ATTRIBUTION_COOKIE_NAME, journeyId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function startAttributionJourney(source: AttributionSource): Promise<string> {
  await pruneExpiredAttributionEvents();
  const journeyId = randomUUID();
  await prisma.eventAttributionEvent.create({
    data: {
      journeyId,
      campaignId: source.campaignId,
      sourceId: source.sourceId,
      eventSlug: source.eventSlug,
      stage: 'event_registration',
    },
  });
  return journeyId;
}

export async function tryStartAttributionJourney(
  source: AttributionSource | null,
): Promise<string | null> {
  if (!source) return null;
  try {
    return await startAttributionJourney(source);
  } catch (error) {
    console.error('[event-attribution] could not start journey:', error);
    return null;
  }
}

export async function recordAttributedStage(
  journeyId: string | null,
  stage: Exclude<AttributionStage, 'event_registration'>,
  details: StageDetails = {},
): Promise<boolean> {
  if (!journeyId) return false;

  const courseSlug = normaliseCourseSlug(details.courseSlug);
  const revenueCents = normaliseRevenueCents(details.revenueCents);
  const currency = details.currency?.trim().toUpperCase() || null;
  if (revenueCents != null && currency !== 'AUD') return false;
  if (stage === 'course_view') {
    if (!courseSlug) return false;
    const course = await prisma.lmsCourse.findUnique({ where: { slug: courseSlug }, select: { id: true } });
    if (!course) return false;
  }

  const source = await prisma.eventAttributionEvent.findFirst({
    where: {
      journeyId,
      campaignId: ATTRIBUTION_CAMPAIGN_ID,
      stage: 'event_registration',
    },
    select: { campaignId: true, sourceId: true, eventSlug: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!source) return false;

  try {
    await prisma.eventAttributionEvent.create({
      data: {
        journeyId,
        campaignId: source.campaignId,
        sourceId: source.sourceId,
        eventSlug: source.eventSlug,
        stage,
        courseSlug,
        revenueCents,
        currency: revenueCents == null ? null : currency,
        transactionId: details.transactionId?.trim().slice(0, 255) || null,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) return false;
    throw error;
  }
}

export async function tryRecordAttributedStage(
  journeyId: string | null,
  stage: Exclude<AttributionStage, 'event_registration'>,
  details: StageDetails = {},
): Promise<boolean> {
  try {
    return await recordAttributedStage(journeyId, stage, details);
  } catch (error) {
    console.error(`[event-attribution] could not record ${stage}:`, error);
    return false;
  }
}

export async function getAttributionReport() {
  await pruneExpiredAttributionEvents();
  const cutoff = retentionCutoff();
  const rows = await prisma.$queryRaw<AggregatedAttributionRow[]>`
    SELECT
      source_id,
      stage,
      COUNT(DISTINCT journey_id)::int AS journey_count,
      COALESCE(SUM(
        CASE WHEN stage IN ('purchase', 'subscription') AND currency = 'AUD'
          THEN revenue_cents ELSE 0 END
      ), 0)::bigint AS revenue_cents,
      SUM(COUNT(*)) OVER ()::bigint AS total_row_count
    FROM event_attribution_events
    WHERE campaign_id = ${ATTRIBUTION_CAMPAIGN_ID}
      AND created_at >= ${cutoff}
    GROUP BY source_id, stage
  `;

  const totals = Object.fromEntries(ATTRIBUTION_STAGES.map((stage) => [stage, 0])) as Record<
    AttributionStage,
    number
  >;
  const bySource = new Map<AttributionSourceId, AttributionReportRow>();
  let totalRevenueCents = 0;
  for (const row of rows) {
    let source = bySource.get(row.source_id);
    if (!source) {
      source = {
        sourceId: row.source_id,
        event_registration: 0,
        course_view: 0,
        checkout_started: 0,
        purchase: 0,
        subscription: 0,
        revenueAud: 0,
      };
      bySource.set(row.source_id, source);
    }
    source[row.stage] = row.journey_count;
    totals[row.stage] += row.journey_count;
    const revenueCents = Number(row.revenue_cents);
    source.revenueAud += revenueCents / 100;
    totalRevenueCents += revenueCents;
  }

  return {
    campaignId: ATTRIBUTION_CAMPAIGN_ID,
    retentionDays: ATTRIBUTION_RETENTION_DAYS,
    complete: true,
    rowCount: Number(rows[0]?.total_row_count ?? 0),
    totals: {
      event_registration: totals.event_registration,
      course_view: totals.course_view,
      checkout_started: totals.checkout_started,
      purchase: totals.purchase,
      subscription: totals.subscription,
      revenueAud: totalRevenueCents / 100,
    },
    sources: ATTRIBUTION_SOURCE_IDS.flatMap((sourceId) => {
      const source = bySource.get(sourceId);
      return source ? [source] : [];
    }),
  };
}
