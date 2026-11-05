/** Shared coaching workspace surface styles. */
export const coachingPage = 'mx-auto w-full max-w-[72rem]';
export const coachingCard =
  'rounded-xl border border-white/[0.08] bg-[#0c1424]/80 p-5 shadow-sm sm:p-6';
export const coachingCardTitle = 'text-lg font-semibold tracking-tight text-white';
export const coachingMuted = 'text-sm leading-relaxed text-slate-400';
export const coachingEyebrow =
  'text-[11px] font-semibold tracking-[0.18em] text-sky-400/90 uppercase';
export const coachingPrimaryBtn =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-[#146fc2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#125da8] disabled:opacity-50';
export const coachingSecondaryBtn =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5 disabled:opacity-50';
export const coachingAlertText = 'text-sm text-amber-300';

/** Page hero band — visual hierarchy without decorative graphics (coaching workspace). */
export const coachingHeroBand =
  'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1424] p-6 shadow-sm ring-1 ring-white/[0.04] sm:p-8';

export const coachingStatTile =
  'rounded-xl border border-white/[0.08] bg-[#0a101c] px-4 py-3 ring-1 ring-white/[0.04] transition-[border-color,box-shadow] duration-200 hover:border-white/[0.12] hover:ring-white/[0.06]';

export const coachingStatValue =
  'mt-1 text-2xl font-semibold text-white tabular-nums tracking-tight';

export const coachingStatLabel = 'text-[11px] font-semibold tracking-wide text-slate-500 uppercase';

export function coachingStatToneRing(tone: 'neutral' | 'good' | 'warn') {
  if (tone === 'good') return 'border-emerald-500/25 ring-emerald-500/10';
  if (tone === 'warn') return 'border-amber-500/25 ring-amber-500/10';
  return '';
}

export function coachingFixImpactAccent(impact: 1 | 2 | 3) {
  if (impact === 3) return 'border-l-[3px] border-l-amber-400/90 pl-[calc(1rem-3px)]';
  if (impact === 2) return 'border-l-[3px] border-l-sky-400/70 pl-[calc(1rem-3px)]';
  return 'border-l-[3px] border-l-emerald-400/60 pl-[calc(1rem-3px)]';
}

export const coachingSuccessBanner =
  'rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100';

export const coachingInfoBanner =
  'rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-100';

export const coachingJumpNavLink =
  'inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

export function coachingProgressTrackClass() {
  return 'h-2 w-full overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/[0.06]';
}

export function coachingProgressFillStyle(percent: number) {
  return { width: `${Math.min(100, Math.max(0, percent))}%` };
}

export const coachingProgressFill =
  'h-full rounded-full bg-gradient-to-r from-[#146fc2] to-sky-400/90 transition-[width] duration-500 ease-out';
