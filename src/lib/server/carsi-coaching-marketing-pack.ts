/**
 * GP-634 (Coaching advantage A7): build a member's AI marketing pack from their assessment and
 * business profile. Website review and checklist are deterministic; the 30-day calendar is
 * drafted through the OpenRouter client CARSI already uses, filtered for claims, and topped up
 * from a template so it always has 30 posts. Each fix is written as a proposed action that the
 * coach approves.
 */
import { buildLocalSearchChecklist } from '@/lib/coaching-portal/marketing-pack/local-search-checklist';
import {
  fixesToProposedActions,
  type ProposedActionInput,
} from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import { reviewWebsite } from '@/lib/coaching-portal/marketing-pack/site-review';
import {
  assembleCalendar,
  buildCalendarMessages,
  parseCalendarResponse,
} from '@/lib/coaching-portal/marketing-pack/social-calendar';
import type {
  ChecklistItem,
  MarketingPack,
  SiteFetchResult,
  SiteReview,
  SocialCalendar,
  TradeVoice,
} from '@/lib/coaching-portal/marketing-pack/types';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import { OpenRouterClient } from '@/lib/openrouter/client';
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { prisma } from '@/lib/prisma';
import { replaceProposedMarketingActions } from '@/lib/server/carsi-coaching-actions-store';
import { fetchPublicPage } from '@/lib/server/safe-public-fetch';

/** A member may regenerate their pack at most this often. */
export const MARKETING_PACK_COOLDOWN_MS = 10 * 60 * 1000;
const AI_TIMEOUT_MS = 60_000;

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
  /** Returns the raw model reply, or null when no AI provider is configured. */
  generateCalendarText: (voice: TradeVoice) => Promise<string | null>;
  savePack: (pack: {
    userId: string;
    pack: MarketingPack;
    model: string | null;
  }) => Promise<{ id: string }>;
  replaceProposedActions: (userId: string, actions: ProposedActionInput[]) => Promise<number>;
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
  const fetched = inputs.websiteUrl ? await deps.fetchSite(inputs.websiteUrl) : null;
  const review = reviewWebsite({
    websiteUrl: inputs.websiteUrl,
    fetch: fetched,
    googleBusinessUrl: inputs.googleBusinessUrl,
    voice: inputs.voice,
  });
  const checklist = buildLocalSearchChecklist(review, inputs.voice);

  let aiText: string | null = null;
  try {
    aiText = await deps.generateCalendarText(inputs.voice);
  } catch {
    aiText = null;
  }
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const calendar = assembleCalendar(
    aiText ? parseCalendarResponse(aiText) : [],
    inputs.voice,
    startDate
  );

  const pack: MarketingPack = {
    review,
    checklist,
    calendar,
    voice: inputs.voice,
    generatedAt: now.toISOString(),
  };
  const saved = await deps.savePack({
    userId,
    pack,
    model: calendar.source === 'template' ? null : (resolveOpenRouterConfig().model ?? null),
  });
  const proposedActionCount = await deps.replaceProposedActions(
    userId,
    fixesToProposedActions(review.fixes)
  );
  return { packId: saved.id, review, checklist, calendar, proposedActionCount };
}

async function openRouterCalendarText(voice: TradeVoice): Promise<string | null> {
  const cfg = resolveOpenRouterConfig();
  if (!cfg.configured) return null;
  const client = new OpenRouterClient({
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
    referer: cfg.referer,
    appTitle: cfg.appTitle,
    timeoutMs: AI_TIMEOUT_MS,
  });
  const response = await client.chat({
    model: cfg.model,
    max_tokens: 6000,
    temperature: 0.7,
    messages: buildCalendarMessages(voice),
  });
  return OpenRouterClient.extractText(response) || null;
}

export const defaultMarketingPackDeps: MarketingPackDeps = {
  now: () => new Date(),
  fetchSite: fetchPublicPage,
  generateCalendarText: openRouterCalendarText,
  savePack: async ({ userId, pack, model }) =>
    prisma.carsiCoachingMarketingPack.create({
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
    }),
  replaceProposedActions: replaceProposedMarketingActions,
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
  try {
    return {
      id: row.id,
      calendarSource: row.calendarSource,
      review: JSON.parse(row.reviewJson) as SiteReview,
      checklist: JSON.parse(row.checklistJson) as ChecklistItem[],
      calendar: JSON.parse(row.calendarJson) as SocialCalendar,
      voice: JSON.parse(row.voiceJson) as TradeVoice,
      generatedAt: row.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}
