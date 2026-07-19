import { randomUUID } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma/client';

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
import { runSerializable } from '@/lib/server/db-tx';

export const ATTRIBUTION_RETENTION_DAYS = 90;
const MAX_REVERSALS_PER_TRANSACTION = 1_000;

type StageDetails = {
  courseSlug?: string;
  revenueCents?: number;
  currency?: string | null;
  transactionId?: string;
};

export type AttributionReversalReason = 'refunded' | 'disputed' | 'dispute_won';

type RevenueReversal = {
  eventId: string;
  eventAt: Date;
  reason: AttributionReversalReason;
  /** Stripe's cumulative refunded/disputed cents for the original transaction. */
  reversedRevenueCents: number;
  currency?: string | null;
};

export type AttributionReversalPersistenceResult = {
  status: 'pending' | 'applied' | 'stale' | 'currency_mismatch' | 'duplicate';
  appliedRows: number;
};

type ReconciliationResult = {
  appliedRows: number;
  targetStatus: Exclude<AttributionReversalPersistenceResult['status'], 'duplicate'>;
};

type StoredRevenueReversal = {
  stripeEventId: string;
  eventAt: Date;
  reason: AttributionReversalReason;
  reversedRevenueCents: number;
};

type ReducedRevenueReversal = {
  reversedRevenueCents: number;
  reason: AttributionReversalReason;
  eventId: string;
  eventAt: Date;
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

const REVERSAL_REASON_ORDER: Record<AttributionReversalReason, number> = {
  disputed: 0,
  dispute_won: 1,
  refunded: 2,
};

/** Deterministically materialise cumulative refunds plus the latest dispute state. */
export function reduceAttributionReversals(
  reversals: StoredRevenueReversal[],
): ReducedRevenueReversal | null {
  const ordered = [...reversals].sort((a, b) => {
    const byTime = a.eventAt.getTime() - b.eventAt.getTime();
    if (byTime !== 0) return byTime;
    const byReason = REVERSAL_REASON_ORDER[a.reason] - REVERSAL_REASON_ORDER[b.reason];
    if (byReason !== 0) return byReason;
    const byAmount = a.reversedRevenueCents - b.reversedRevenueCents;
    return byAmount !== 0 ? byAmount : a.stripeEventId.localeCompare(b.stripeEventId);
  });
  if (ordered.length === 0) return null;

  let refund: StoredRevenueReversal | null = null;
  let dispute: StoredRevenueReversal | null = null;
  let won: StoredRevenueReversal | null = null;
  for (const reversal of ordered) {
    if (reversal.reason === 'refunded') {
      if (!refund || reversal.reversedRevenueCents >= refund.reversedRevenueCents) {
        refund = reversal;
      }
    } else if (reversal.reason === 'disputed') {
      dispute = reversal;
      won = null;
    } else {
      dispute = null;
      won = reversal;
    }
  }

  const refundCents = refund?.reversedRevenueCents ?? 0;
  const disputeCents = dispute?.reversedRevenueCents ?? 0;
  if (dispute && disputeCents > refundCents) {
    return {
      reversedRevenueCents: disputeCents,
      reason: 'disputed',
      eventId: dispute.stripeEventId,
      eventAt: dispute.eventAt,
    };
  }
  if (refund) {
    return {
      reversedRevenueCents: refundCents,
      reason: 'refunded',
      eventId: refund.stripeEventId,
      eventAt: refund.eventAt,
    };
  }
  const terminal = won ?? dispute ?? ordered.at(-1)!;
  return {
    reversedRevenueCents: disputeCents,
    reason: terminal.reason,
    eventId: terminal.stripeEventId,
    eventAt: terminal.eventAt,
  };
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

  const transactionId = details.transactionId?.trim().slice(0, 255) || null;
  const data = {
    journeyId,
    campaignId: source.campaignId,
    sourceId: source.sourceId,
    eventSlug: source.eventSlug,
    stage,
    courseSlug,
    revenueCents,
    currency: revenueCents == null ? null : currency,
    transactionId,
  };

  try {
    if ((stage === 'purchase' || stage === 'subscription') && transactionId) {
      const outcome = await runSerializable(async (tx) => {
        let recorded = true;
        try {
          await tx.eventAttributionEvent.create({ data });
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          recorded = false;
        }
        const reconciliation = await reconcileAttributedRevenueReversals(tx, transactionId);
        return { recorded, appliedRows: reconciliation.appliedRows };
      });
      if (outcome.appliedRows > 0) {
        console.info('[event-attribution] reversal reconciliation', {
          status: 'applied',
          appliedRows: outcome.appliedRows,
        });
      }
      return outcome.recorded;
    }
    await prisma.eventAttributionEvent.create({ data });
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

async function reconcileAttributedRevenueReversals(
  tx: Prisma.TransactionClient,
  transactionId: string,
  target?: { stripeEventId: string; currency: string },
): Promise<ReconciliationResult> {
  const paidRows = await tx.eventAttributionEvent.findMany({
    where: { transactionId, stage: { in: ['purchase', 'subscription'] } },
    select: { id: true, revenueCents: true, currency: true },
    take: 2,
  });
  if (paidRows.length === 0) return { appliedRows: 0, targetStatus: 'pending' };

  const reversals = await tx.eventAttributionReversal.findMany({
    where: { transactionId },
    select: {
      stripeEventId: true,
      eventAt: true,
      reason: true,
      reversedRevenueCents: true,
      currency: true,
    },
    take: MAX_REVERSALS_PER_TRANSACTION + 1,
  });
  if (reversals.length > MAX_REVERSALS_PER_TRANSACTION) {
    throw new Error('Attribution reversal reconciliation limit exceeded');
  }

  let appliedRows = 0;
  let targetCompatible = false;
  let targetWinner = false;
  const reconciledAt = new Date();
  for (const paidRow of paidRows) {
    const compatible = reversals.filter((row) => row.currency === paidRow.currency);
    const reduced = reduceAttributionReversals(
      compatible.map((row) => ({
        ...row,
        reason: row.reason as AttributionReversalReason,
      })),
    );
    targetCompatible ||= Boolean(
      target &&
        target.currency === paidRow.currency &&
        compatible.some((row) => row.stripeEventId === target.stripeEventId),
    );
    await tx.eventAttributionReversal.updateMany({
      where: { transactionId, currency: { not: paidRow.currency ?? '' } },
      data: { status: 'currency_mismatch', reconciledAt },
    });
    if (!reduced) continue;
    targetWinner ||= reduced.eventId === target?.stripeEventId;

    const result = await tx.eventAttributionEvent.updateMany({
      where: { id: paidRow.id },
      data: {
        reversedRevenueCents: Math.min(
          paidRow.revenueCents ?? 0,
          Math.max(0, reduced.reversedRevenueCents),
        ),
        reversalReason: reduced.reason,
        reversalEventId: reduced.eventId,
        reversalEventAt: reduced.eventAt,
      },
    });
    appliedRows += result.count;
    await tx.eventAttributionReversal.updateMany({
      where: { transactionId, currency: paidRow.currency ?? '' },
      data: { status: 'stale', reconciledAt },
    });
    await tx.eventAttributionReversal.updateMany({
      where: { stripeEventId: reduced.eventId },
      data: { status: 'applied', reconciledAt },
    });
  }
  return {
    appliedRows,
    targetStatus: targetWinner ? 'applied' : targetCompatible ? 'stale' : 'currency_mismatch',
  };
}

/**
 * Persist a signed provider reversal before webhook acknowledgement. The raw
 * event exists independently of its paid attribution row, so delivery order
 * cannot erase the adjustment. Reconciliation is added in the next TDD slice.
 */
export async function persistAttributedRevenueReversal(
  transactionId: string,
  reversal: RevenueReversal,
): Promise<AttributionReversalPersistenceResult> {
  const normalisedTransactionId = transactionId.trim().slice(0, 255);
  const stripeEventId = reversal.eventId.trim().slice(0, 255);
  const currency = reversal.currency?.trim().toUpperCase() || 'AUD';
  const reversedRevenueCents = Math.max(0, Math.round(reversal.reversedRevenueCents));
  if (
    !normalisedTransactionId ||
    !stripeEventId ||
    !Number.isFinite(reversal.reversedRevenueCents) ||
    !Number.isFinite(reversal.eventAt.getTime()) ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    throw new Error('Invalid attributed revenue reversal');
  }

  const result = await runSerializable<AttributionReversalPersistenceResult>(async (tx) => {
    let duplicate = false;
    const data = {
      stripeEventId,
      transactionId: normalisedTransactionId,
      reversedRevenueCents,
      currency,
      reason: reversal.reason,
      eventAt: reversal.eventAt,
    };
    try {
      await tx.eventAttributionReversal.create({ data });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await tx.eventAttributionReversal.findUnique({
        where: { stripeEventId },
        select: {
          transactionId: true,
          reversedRevenueCents: true,
          currency: true,
          reason: true,
          eventAt: true,
        },
      });
      if (
        !existing ||
        existing.transactionId !== data.transactionId ||
        existing.reversedRevenueCents !== data.reversedRevenueCents ||
        existing.currency !== data.currency ||
        existing.reason !== data.reason ||
        existing.eventAt.getTime() !== data.eventAt.getTime()
      ) {
        throw new Error('Stripe reversal event identity conflict');
      }
      duplicate = true;
    }
    const reconciliation = await reconcileAttributedRevenueReversals(tx, normalisedTransactionId, {
      stripeEventId,
      currency,
    });
    const status: AttributionReversalPersistenceResult['status'] = duplicate
      ? 'duplicate'
      : reconciliation.targetStatus;
    return { status, appliedRows: reconciliation.appliedRows };
  });
  console.info('[event-attribution] reversal reconciliation', result);
  return result;
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
          THEN revenue_cents - reversed_revenue_cents ELSE 0 END
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
        netRevenueAud: 0,
      };
      bySource.set(row.source_id, source);
    }
    source[row.stage] = row.journey_count;
    totals[row.stage] += row.journey_count;
    const revenueCents = Number(row.revenue_cents);
    source.netRevenueAud += revenueCents / 100;
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
      netRevenueAud: totalRevenueCents / 100,
    },
    sources: ATTRIBUTION_SOURCE_IDS.flatMap((sourceId) => {
      const source = bySource.get(sourceId);
      return source ? [source] : [];
    }),
  };
}
