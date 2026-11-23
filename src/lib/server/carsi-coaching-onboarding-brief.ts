/**
 * GP-628 / A1 — persist coach brief on onboarding submit (model or fallback).
 */
import {
  buildCoachBriefMessages,
  composeFallbackCoachBrief,
  validateCoachBrief,
  type OnboardingCoachBrief,
} from '@/lib/coaching-portal/onboarding-coach-brief';
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';
import { OpenRouterClient } from '@/lib/openrouter/client';
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { prisma } from '@/lib/prisma';

const MODEL_TIMEOUT_MS = 45_000;

function parseModelBrief(text: string, snapshot: CoachingOnboardingSnapshot): OnboardingCoachBrief | null {
  const fallback = composeFallbackCoachBrief(snapshot);
  try {
    const o = JSON.parse(text) as Partial<OnboardingCoachBrief>;
    const merged: OnboardingCoachBrief = {
      ...fallback,
      ...o,
      version: 1,
      generatedAt: new Date().toISOString(),
      source: 'model',
      model: resolveOpenRouterConfig()?.model ?? null,
      memberName: snapshot.member.fullName,
      businessName: fallback.businessName,
      sections: Array.isArray(o.sections) ? (o.sections as OnboardingCoachBrief['sections']) : fallback.sections,
      draftActions: Array.isArray(o.draftActions)
        ? (o.draftActions as OnboardingCoachBrief['draftActions'])
        : fallback.draftActions,
      summary: typeof o.summary === 'string' ? o.summary : fallback.summary,
      suggestedFocusTitle:
        typeof o.suggestedFocusTitle === 'string' ? o.suggestedFocusTitle : fallback.suggestedFocusTitle,
      suggestedFocusDescription:
        typeof o.suggestedFocusDescription === 'string'
          ? o.suggestedFocusDescription
          : fallback.suggestedFocusDescription,
    };
    return validateCoachBrief(merged) ? merged : null;
  } catch {
    return null;
  }
}

export async function generateAndStoreOnboardingCoachBrief(
  userId: string,
  snapshot: CoachingOnboardingSnapshot
): Promise<OnboardingCoachBrief> {
  const config = resolveOpenRouterConfig();
  let brief = composeFallbackCoachBrief(snapshot);

  if (config) {
    const messages = buildCoachBriefMessages({ snapshot });
    try {
      const client = new OpenRouterClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        referer: config.referer,
        appTitle: config.appTitle,
        timeoutMs: MODEL_TIMEOUT_MS,
      });
      const res = await client.chat({
        model: config.model,
        max_tokens: 1_800,
        messages: [
          { role: 'system', content: messages.system },
          { role: 'user', content: messages.user },
        ],
      });
      const text = OpenRouterClient.extractText(res).trim();
      const parsed = text ? parseModelBrief(text, snapshot) : null;
      if (parsed) brief = parsed;
    } catch (err) {
      console.error('[coaching] onboarding coach brief model failed', { userId, err });
    }
  }

  const at = new Date();
  await prisma.carsiCoachingBusinessProfile.update({
    where: { userId },
    data: {
      onboardingCoachBriefJson: JSON.stringify(brief),
      onboardingCoachBriefAt: at,
    },
  });

  return brief;
}

export async function getOnboardingCoachBriefForCoach(userId: string): Promise<OnboardingCoachBrief | null> {
  const row = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId },
    select: { onboardingCoachBriefJson: true },
  });
  if (!row?.onboardingCoachBriefJson) return null;
  try {
    return JSON.parse(row.onboardingCoachBriefJson) as OnboardingCoachBrief;
  } catch {
    return null;
  }
}