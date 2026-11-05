import type { MarketingPack, SiteReview } from './types';

export type MarketingPackSummary = {
  id: string;
  generatedAt: string;
  checksPassed: number;
  checksTotal: number;
  fixCount: number;
};

export function summarizeMarketingPack(id: string, pack: MarketingPack): MarketingPackSummary {
  const checksPassed = pack.review.checks.filter((c) => c.passed).length;
  return {
    id,
    generatedAt: pack.generatedAt,
    checksPassed,
    checksTotal: pack.review.checks.length,
    fixCount: pack.review.fixes.length,
  };
}

export function packProgressDelta(
  current: MarketingPackSummary,
  previous: MarketingPackSummary | null
): { checksDelta: number | null; fixCountDelta: number | null } {
  if (!previous) return { checksDelta: null, fixCountDelta: null };
  return {
    checksDelta: current.checksPassed - previous.checksPassed,
    fixCountDelta: current.fixCount - previous.fixCount,
  };
}

export function findFixInReview(review: SiteReview, fixId: string) {
  return review.fixes.find((f) => f.id === fixId) ?? null;
}
