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

export function marketingFixEffortLabel(effort: MarketingFix['effort']) {
  if (effort === 1) return '~15 min';
  if (effort === 2) return '1–2 hours';
  return 'Needs web or coach help';
}

export function marketingFixEffortBadgeClass(effort: MarketingFix['effort']) {
  if (effort === 3) return 'bg-violet-500/10 text-violet-200 ring-violet-400/20';
  if (effort === 2) return 'bg-white/[0.06] text-slate-300 ring-white/10';
  return 'bg-white/[0.04] text-slate-400 ring-white/[0.06]';
}

export function marketingFixAreaLabel(area: MarketingFix['area']) {
  return area === 'website' ? 'Website' : 'Google profile';
}
