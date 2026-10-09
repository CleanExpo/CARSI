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

export function coachingProgressTrackClass() {
  return 'h-2 w-full overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/[0.06]';
}

export function coachingProgressFillStyle(percent: number) {
  return { width: `${Math.min(100, Math.max(0, percent))}%` };
}

export const coachingProgressFill =
  'h-full rounded-full bg-gradient-to-r from-[#146fc2] to-sky-400/90 transition-[width] duration-500 ease-out';
