/**
 * GP-634 (Coaching advantage A7): build a member's AI marketing pack from their assessment and
 * business profile. Website review, checklist and the 30-day calendar are deterministic: the
 * calendar is filled from a vetted, claim-free template set in the member's trade voice, and no
 * model text reaches it. Each fix is written as a proposed action that the coach approves.
 */
import { buildLocalSearchChecklist } from '@/lib/coaching-portal/marketing-pack/local-search-checklist';
import {
  fixesToProposedActions,
  type ProposedActionInput,
} from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import { reviewWebsite, sanitizeVoice } from '@/lib/coaching-portal/marketing-pack/site-review';
import { assembleCalendar } from '@/lib/coaching-portal/marketing-pack/social-calendar';
import type {
  ChecklistItem,
  MarketingPack,
  SiteFetchResult,
  SiteReview,
  SocialCalendar,
  TradeVoice,
} from '@/lib/coaching-portal/marketing-pack/types';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import { parseStoredMarketingPackRow } from '@/lib/coaching-portal/marketing-pack/stored-pack';
import {
  summarizeMarketingPack,
  type MarketingPackSummary,
} from '@/lib/coaching-portal/marketing-pack/pack-summary';
import { prisma } from '@/lib/prisma';
import { replaceProposedMarketingActions } from '@/lib/server/carsi-coaching-actions-store';
import { fetchPublicPage } from '@/lib/server/safe-public-fetch';

/** A member may regenerate their pack at most this often. */
export const MARKETING_PACK_COOLDOWN_MS = 10 * 60 * 1000;

export type MarketingInputs = {
  websiteUrl: string | null;
  googleBusinessUrl: string | null;
  voice: TradeVoice;
};

type ProfileFields = {
  businessName: string | null;
  industry: string | null;
  location: string | null;
  mainServices: string | null;
  website: string | null;
  googleBusinessUrl: string | null;
};

const pick = (...values: Array<string | null | undefined>) =>
  values.map((v) => v?.trim()).find((v) => Boolean(v)) ?? null;

/** Latest submitted assessment answers win over the business profile. */
export function resolveMarketingInputs(
  profile: ProfileFields | null,
  responses: Record<string, string>
): MarketingInputs {
  return {
    websiteUrl: pick(responses.website_url, profile?.website),
    googleBusinessUrl: pick(responses.google_business_url, profile?.googleBusinessUrl),
    voice: {
      businessName: profile?.businessName?.trim() ?? '',
      trade: profile?.industry?.trim() ?? '',
      town: profile?.location?.trim() ?? '',
      services: profile?.mainServices?.trim() ?? '',
    },
  };
}

export type MarketingPackDeps = {
  now: () => Date;
  fetchSite: (url: string) => Promise<SiteFetchResult>;
  /**
   * Writes the pack and its proposed actions together: both commit or neither does, so a
   * saved pack (which starts the rebuild cooldown) always has its proposed actions.
   */
  persist: (input: {
    userId: string;
    pack: MarketingPack;
    model: string | null;
    actions: ProposedActionInput[];
  }) => Promise<{ id: string; proposedActionCount: number }>;
};

export type MarketingPackResult = {
  packId: string;
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  proposedActionCount: number;
};

export async function generateMarketingPack(
  userId: string,
  inputs: MarketingInputs,
  deps: MarketingPackDeps
): Promise<MarketingPackResult> {
  const now = deps.now();
  // Every builder below writes copy from controlled wording only (sanitizeVoice); the raw profile
  // reaches reviewWebsite so it can check the page against the member's own trade and town
  // (Codex P1, head 32d27443). Only the sanitised voice is stored.
  const voice = sanitizeVoice(inputs.voice);
  const fetched = inputs.websiteUrl ? await deps.fetchSite(inputs.websiteUrl) : null;
  const review = reviewWebsite({
    websiteUrl: inputs.websiteUrl,
    fetch: fetched,
    googleBusinessUrl: inputs.googleBusinessUrl,
    voice: inputs.voice,
  });
  const checklist = buildLocalSearchChecklist(review, inputs.voice);

  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const calendar = assembleCalendar(inputs.voice, startDate);

  const pack: MarketingPack = {
    review,
    checklist,
    calendar,
    voice,
    generatedAt: now.toISOString(),
  };
  const saved = await deps.persist({
    userId,
    pack,
    model: null,
    actions: fixesToProposedActions(review.fixes),
  });
  return {
    packId: saved.id,
    review,
    checklist,
    calendar,
    proposedActionCount: saved.proposedActionCount,
  };
}

export const defaultMarketingPackDeps: MarketingPackDeps = {
  now: () => new Date(),
  fetchSite: fetchPublicPage,
  persist: async ({ userId, pack, model, actions }) =>
    prisma.$transaction(async (tx) => {
      const saved = await tx.carsiCoachingMarketingPack.create({
        data: {
          userId,
          websiteUrl: pack.review.websiteUrl,
          googleBusinessUrl: pack.review.googleBusinessUrl,
          reviewJson: JSON.stringify(pack.review),
          checklistJson: JSON.stringify(pack.checklist),
          calendarJson: JSON.stringify(pack.calendar),
          voiceJson: JSON.stringify(pack.voice),
          calendarSource: pack.calendar.source,
          model,
        },
        select: { id: true },
      });
      const proposedActionCount = await replaceProposedMarketingActions(userId, actions, tx);
      return { id: saved.id, proposedActionCount };
    }),
};

/** Load inputs from the member's profile and latest submitted assessment. */
export async function loadMarketingInputsForUser(userId: string): Promise<MarketingInputs> {
  const [profile, assessment] = await Promise.all([
    prisma.carsiCoachingBusinessProfile.findUnique({
      where: { userId },
      select: {
        businessName: true,
        industry: true,
        location: true,
        mainServices: true,
        website: true,
        googleBusinessUrl: true,
      },
    }),
    prisma.carsiCoachingAssessment.findFirst({
      where: { userId, status: { in: ['submitted', 'reviewed'] } },
      orderBy: { submittedAt: 'desc' },
      select: { responsesJson: true },
    }),
  ]);
  const responses = assessment ? parseAssessmentResponsesJson(assessment.responsesJson) : {};
  return resolveMarketingInputs(profile, responses);
}

export type StoredMarketingPack = MarketingPack & { id: string; calendarSource: string };

export async function getLatestMarketingPackForUser(
  userId: string
): Promise<StoredMarketingPack | null> {
  const row = await prisma.carsiCoachingMarketingPack.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  const parsed = parseStoredMarketingPackRow({
    id: row.id,
    calendarSource: row.calendarSource,
    reviewJson: row.reviewJson,
    checklistJson: row.checklistJson,
    calendarJson: row.calendarJson,
    voiceJson: row.voiceJson,
    createdAt: row.createdAt,
  });
  return parsed;
}

const PACK_HISTORY_LIMIT = 5;

/** Recent packs for progress comparison (newest first). */
export async function listMarketingPackSummariesForUser(
  userId: string,
  limit = PACK_HISTORY_LIMIT
): Promise<MarketingPackSummary[]> {
  const rows = await prisma.carsiCoachingMarketingPack.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      reviewJson: true,
      checklistJson: true,
      calendarJson: true,
      voiceJson: true,
      calendarSource: true,
      createdAt: true,
    },
  });
  const summaries: MarketingPackSummary[] = [];
  for (const row of rows) {
    const parsed = parseStoredMarketingPackRow({
      id: row.id,
      calendarSource: row.calendarSource,
      reviewJson: row.reviewJson,
      checklistJson: row.checklistJson,
      calendarJson: row.calendarJson,
      voiceJson: row.voiceJson,
      createdAt: row.createdAt,
    });
    if (parsed) summaries.push(summarizeMarketingPack(parsed.id, parsed));
  }
  return summaries;
}
