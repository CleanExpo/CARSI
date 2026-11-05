import { findFixInReview } from '@/lib/coaching-portal/marketing-pack/pack-summary';
import { MARKETING_ACTION_GOAL_PREFIX } from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import { parseStoredMarketingPackRow } from '@/lib/coaching-portal/marketing-pack/stored-pack';
import type { MarketingFix } from '@/lib/coaching-portal/marketing-pack/types';
import {
  marketingFixEffortLabel,
  marketingFixImpactLabel,
} from '@/lib/coaching-portal/marketing-pack/ui-labels';
import { prisma } from '@/lib/prisma';

export type MarketingProposedActionMeta = {
  rank: number;
  fixId: string;
  area: MarketingFix['area'] | null;
  impact: MarketingFix['impact'] | null;
  effort: MarketingFix['effort'] | null;
  impactLabel: string | null;
  effortLabel: string | null;
  packGeneratedAt: string | null;
};

export async function loadMarketingFixMetaByUserId(
  userIds: string[]
): Promise<Map<string, { generatedAt: string; review: { fixes: MarketingFix[] } }>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.carsiCoachingMarketingPack.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      reviewJson: true,
      checklistJson: true,
      calendarJson: true,
      voiceJson: true,
      calendarSource: true,
      createdAt: true,
      id: true,
    },
  });
  const map = new Map<string, { generatedAt: string; review: { fixes: MarketingFix[] } }>();
  for (const row of rows) {
    if (map.has(row.userId)) continue;
    const parsed = parseStoredMarketingPackRow({
      id: row.id,
      calendarSource: row.calendarSource,
      reviewJson: row.reviewJson,
      checklistJson: row.checklistJson,
      calendarJson: row.calendarJson,
      voiceJson: row.voiceJson,
      createdAt: row.createdAt,
    });
    if (parsed) {
      map.set(row.userId, {
        generatedAt: parsed.generatedAt,
        review: parsed.review,
      });
    }
  }
  return map;
}

export function marketingMetaForAction(
  userId: string,
  goalId: string | null,
  sortOrder: number | null,
  packs: Map<string, { generatedAt: string; review: { fixes: MarketingFix[] } }>
): MarketingProposedActionMeta | null {
  if (!goalId?.startsWith(MARKETING_ACTION_GOAL_PREFIX)) return null;
  const fixId = goalId.slice(MARKETING_ACTION_GOAL_PREFIX.length);
  const pack = packs.get(userId);
  const fix = pack ? findFixInReview(pack.review, fixId) : null;
  return {
    rank: fix?.rank ?? (sortOrder ?? 0) + 1,
    fixId,
    area: fix?.area ?? null,
    impact: fix?.impact ?? null,
    effort: fix?.effort ?? null,
    impactLabel: fix ? marketingFixImpactLabel(fix.impact) : null,
    effortLabel: fix ? marketingFixEffortLabel(fix.effort) : null,
    packGeneratedAt: pack?.generatedAt ?? null,
  };
}
