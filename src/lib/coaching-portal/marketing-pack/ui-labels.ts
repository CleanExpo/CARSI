import type { MarketingFix } from '@/lib/coaching-portal/marketing-pack/types';

export function marketingFixImpactLabel(impact: MarketingFix['impact']) {
  if (impact === 3) return 'High impact';
  if (impact === 2) return 'Medium impact';
  return 'Quick win';
}

export function marketingFixImpactBadgeClass(impact: MarketingFix['impact']) {
  if (impact === 3) return 'bg-amber-500/15 text-amber-200 ring-amber-400/25';
  if (impact === 2) return 'bg-sky-500/15 text-sky-200 ring-sky-400/25';
  return 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25';
}
